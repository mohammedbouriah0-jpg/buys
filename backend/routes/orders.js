const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, requireActiveSubscription } = require('../middleware/auth');
const { buildFullUrl } = require('../utils/url-helper');
const { sendNewOrderNotification } = require('../services/push-notifications');

// Get user orders - OPTIMIZED: Single query for items instead of N+1
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get orders
    const [orders] = await pool.query(`
      SELECT o.*
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);
    
    if (orders.length === 0) {
      return res.json([]);
    }

    // Get all items for all orders in ONE query (avoid N+1)
    const orderIds = orders.map(o => o.id);
    const [allItems] = await pool.query(`
      SELECT oi.*, oi.shop_order_number, p.name as product_name, p.image_url as product_image_url,
      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url,
      s.shop_name, s.id as shop_id
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN shops s ON oi.shop_id = s.id
      WHERE oi.order_id IN (?)
    `, [orderIds]);
    
    // Group items by order_id
    const itemsByOrderId = {};
    allItems.forEach(item => {
      const imageUrl = item.primary_image_url || item.product_image_url;
      const processedItem = {
        ...item,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        primary_image_url: undefined,
        product_image_url: undefined
      };
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(processedItem);
    });
    
    // Attach items to orders
    orders.forEach(order => {
      order.items = itemsByOrderId[order.id] || [];
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get user orders count
router.get('/count', auth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('❌ Erreur count:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get shop orders - OPTIMIZED (requires active subscription)
router.get('/shop', auth, requireActiveSubscription, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    const [orders] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.returns_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id IN (
        SELECT DISTINCT order_id 
        FROM order_items 
        WHERE shop_id = ?
      )
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [shopId, limit, offset]);

    if (orders.length === 0) {
      return res.json([]);
    }

    // Get all items for all orders in ONE query (avoid N+1)
    const orderIds = orders.map(o => o.id);
    const [allItems] = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image_url,
      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (?) AND oi.shop_id = ?
    `, [orderIds, shopId]);
    
    // Group items by order_id
    const itemsByOrderId = {};
    allItems.forEach(item => {
      const imageUrl = item.primary_image_url || item.product_image_url;
      const processedItem = {
        ...item,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        primary_image_url: undefined,
        product_image_url: undefined
      };
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(processedItem);
    });
    
    // Attach items to orders and get shop_order_number
    orders.forEach(order => {
      order.items = itemsByOrderId[order.id] || [];
      if (order.items.length > 0 && order.items[0].shop_order_number) {
        order.shop_order_number = order.items[0].shop_order_number;
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get shop orders count (requires active subscription)
router.get('/shop/count', auth, requireActiveSubscription, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    const [result] = await pool.query(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      WHERE o.id IN (
        SELECT DISTINCT order_id 
        FROM order_items 
        WHERE shop_id = ?
      )
    `, [shopId]);

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('❌ Erreur count:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 GET /orders/:id - Début');
    console.log('📋 Order ID:', req.params.id);
    console.log('👤 User:', { id: req.user.id, type: req.user.type });

    const [orders] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.phone as customer_phone, u.email as customer_email, u.returns_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [req.params.id]);

    console.log('📦 Orders trouvées:', orders.length);

    if (orders.length === 0) {
      console.log('❌ Commande non trouvée');
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const order = orders[0];
    console.log('✅ Commande trouvée:', { id: order.id, user_id: order.user_id, status: order.status });

    // Vérifier les autorisations
    // Si c'est un client, il doit être le propriétaire de la commande
    if (req.user.type === 'client') {
      console.log('🔐 Vérification client:', { order_user_id: order.user_id, req_user_id: req.user.id });
      if (order.user_id !== req.user.id) {
        console.log('❌ Client non autorisé');
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
      console.log('✅ Client autorisé');
    }

    // Si c'est une boutique, elle doit avoir au moins un produit dans la commande
    if (req.user.type === 'shop') {
      console.log('🏪 Vérification boutique');
      const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
      console.log('🏪 Boutiques trouvées:', shops.length);
      
      if (shops.length === 0) {
        console.log('❌ Boutique non trouvée');
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
      const shopId = shops[0].id;
      console.log('🏪 Shop ID:', shopId);
      
      const [shopItems] = await pool.query(
        'SELECT id FROM order_items WHERE order_id = ? AND shop_id = ?',
        [order.id, shopId]
      );
      console.log('📦 Items de la boutique:', shopItems.length);
      
      if (shopItems.length === 0) {
        console.log('❌ Boutique non autorisée (pas de produits dans cette commande)');
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
      console.log('✅ Boutique autorisée');
    }

    // Get items for this order
    const [items] = await pool.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image_url,
      (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url,
      s.shop_name, s.id as shop_id
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN shops s ON oi.shop_id = s.id
      WHERE oi.order_id = ?
    `, [order.id]);

    // Convertir les URLs d'images
    order.items = items.map(item => {
      const imageUrl = item.primary_image_url || item.product_image_url;
      return {
        ...item,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        primary_image_url: undefined,
        product_image_url: undefined
      };
    });

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    console.log('🛒 Création de commande(s)');
    const { items, shipping_address, phone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Panier vide' });
    }

    // Grouper les items par boutique
    const itemsByShop = {};
    
    for (let item of items) {
      const [products] = await pool.query('SELECT price, shop_id FROM products WHERE id = ?', [item.product_id]);
      if (products.length > 0) {
        const shopId = products[0].shop_id;
        if (!itemsByShop[shopId]) {
          itemsByShop[shopId] = [];
        }
        itemsByShop[shopId].push({
          ...item,
          price: products[0].price,
          shop_id: shopId
        });
      }
    }

    console.log('🏪 Nombre de boutiques:', Object.keys(itemsByShop).length);

    const createdOrders = [];

    // Créer une commande pour chaque boutique
    for (let shopId in itemsByShop) {
      const shopItems = itemsByShop[shopId];
      
      // Calculer le total pour cette boutique
      let shopTotal = 0;
      for (let item of shopItems) {
        shopTotal += item.price * item.quantity;
      }

      console.log(`📦 Commande pour boutique ${shopId}: ${shopTotal} DA (${shopItems.length} produits)`);

      // Calculer le prochain numéro de commande pour cette boutique
      const [lastOrderNum] = await pool.query(
        'SELECT MAX(shop_order_number) as last_num FROM order_items WHERE shop_id = ?',
        [shopId]
      );
      const shopOrderNumber = (lastOrderNum[0].last_num || 0) + 1;
      console.log(`🔢 Numéro de commande boutique ${shopId}: #${shopOrderNumber}`);

      // Créer la commande avec statut 'pending'
      const [result] = await pool.query(
        'INSERT INTO orders (user_id, total_amount, shipping_address, phone, status) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, shopTotal, shipping_address, phone, 'pending']
      );

      const orderId = result.insertId;

      // Insérer les items de cette boutique et diminuer le stock
      for (let item of shopItems) {
        console.log('💾 [ORDER] Insertion item:', {
          orderId,
          product_id: item.product_id,
          shop_id: item.shop_id,
          quantity: item.quantity,
          price: item.price,
          variant_size: item.variant_size || null,
          variant_color: item.variant_color || null
        });
        
        // Vérifier et diminuer le stock
        if (item.variant_size || item.variant_color) {
          // Produit avec variantes
          console.log(`🔍 Recherche variante: product_id=${item.product_id}, size="${item.variant_size}", color="${item.variant_color}"`);
          
          // Construire la requête pour gérer NULL et chaînes vides
          let query = 'SELECT id, stock FROM product_variants WHERE product_id = ?';
          const params = [item.product_id];
          
          // Gérer la taille (NULL ou valeur)
          if (item.variant_size) {
            query += ' AND size = ?';
            params.push(item.variant_size);
          } else {
            query += ' AND (size IS NULL OR size = "")';
          }
          
          // Gérer la couleur (NULL ou valeur)
          if (item.variant_color) {
            query += ' AND color = ?';
            params.push(item.variant_color);
          } else {
            query += ' AND (color IS NULL OR color = "")';
          }
          
          const [variants] = await pool.query(query, params);
          
          console.log(`📦 Variantes trouvées: ${variants.length}`);
          if (variants.length > 0) {
            console.log(`   Variante ID: ${variants[0].id}, Stock actuel: ${variants[0].stock}`);
          }
          
          if (variants.length > 0) {
            const currentStock = variants[0].stock;
            if (currentStock < item.quantity) {
              throw new Error(`Stock insuffisant pour ${item.variant_size || 'taille non spécifiée'} ${item.variant_color || 'couleur non spécifiée'}`);
            }
            
            // Diminuer le stock de la variante
            await pool.query(
              'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
              [item.quantity, variants[0].id]
            );
            console.log(`📉 Stock variante diminué: -${item.quantity} (nouveau stock: ${currentStock - item.quantity})`);
          } else {
            console.log(`⚠️ Aucune variante trouvée pour ce produit avec ces caractéristiques`);
          }
        } else {
          // Produit sans variantes
          const [products] = await pool.query(
            'SELECT stock FROM products WHERE id = ?',
            [item.product_id]
          );
          
          if (products.length > 0 && products[0].stock !== null) {
            const currentStock = products[0].stock;
            if (currentStock < item.quantity) {
              throw new Error(`Stock insuffisant pour ce produit`);
            }
            
            // Diminuer le stock du produit
            await pool.query(
              'UPDATE products SET stock = stock - ? WHERE id = ?',
              [item.quantity, item.product_id]
            );
            console.log(`📉 Stock produit diminué: -${item.quantity}`);
          }
        }
        
        await pool.query(
          'INSERT INTO order_items (order_id, product_id, shop_id, quantity, price, variant_size, variant_color, shop_order_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.shop_id, item.quantity, item.price, item.variant_size || null, item.variant_color || null, shopOrderNumber]
        );
      }

      createdOrders.push({
        id: orderId,
        shop_id: shopId,
        total: shopTotal,
        items_count: shopItems.length
      });

      // Créer une notification pour la boutique
      try {
        await pool.query(
          `INSERT INTO notifications (shop_id, type, title, message, order_id) 
           VALUES (?, 'new_order', ?, ?, ?)`,
          [
            shopId,
            '🎉 Nouvelle commande !',
            `Commande #${orderId} - ${shopTotal.toFixed(2)} DA (${shopItems.length} produit${shopItems.length > 1 ? 's' : ''})`,
            orderId
          ]
        );
        console.log(`🔔 Notification créée pour boutique ${shopId}`);

        // Envoyer une notification push
        const pushResult = await sendNewOrderNotification(
          shopId,
          orderId,
          shopTotal,
          shopItems.length,
          pool
        );
        
        if (pushResult.success) {
          console.log(`📱 Notification push envoyée pour boutique ${shopId}`);
        } else {
          console.log(`⚠️ Notification push non envoyée: ${pushResult.reason || pushResult.error}`);
        }
      } catch (notifError) {
        console.error('⚠️ Erreur création notification:', notifError);
        // Ne pas bloquer la commande si la notification échoue
      }
    }

    // Clear cart
    await pool.query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

    console.log('✅ Commandes créées:', createdOrders.length);

    res.status(201).json({ 
      orders: createdOrders,
      message: `${createdOrders.length} commande(s) créée(s) avec succès`
    });
  } catch (error) {
    console.error('❌ Erreur création commande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mark order as returned (shop only - requires active subscription)
router.post('/:id/return', auth, requireActiveSubscription, async (req, res) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;

    console.log('🔄 Marquage retour pour commande:', orderId);
    console.log('👤 User type:', req.user.type);

    // Vérifier que c'est une boutique
    if (req.user.type !== 'shop') {
      return res.status(403).json({ error: 'Seules les boutiques peuvent marquer un retour' });
    }

    // Récupérer l'ID de la boutique
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }
    const shopId = shops[0].id;

    // Vérifier que la commande existe et contient des produits de cette boutique
    const [orders] = await pool.query(
      'SELECT o.*, u.id as customer_id FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Vérifier que la boutique a des produits dans cette commande
    const [shopItems] = await pool.query(
      'SELECT id FROM order_items WHERE order_id = ? AND shop_id = ?',
      [orderId, shopId]
    );

    if (shopItems.length === 0) {
      return res.status(403).json({ error: 'Cette commande ne contient pas vos produits' });
    }

    // Vérifier que la commande est livrée
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Seules les commandes livrées peuvent être marquées comme retournées' });
    }

    // Vérifier qu'un retour n'a pas déjà été enregistré
    if (order.return_requested) {
      return res.status(400).json({ error: 'Un retour a déjà été enregistré pour cette commande' });
    }

    // Marquer la commande comme retournée
    await pool.query(
      'UPDATE orders SET return_requested = TRUE, return_reason = ?, return_date = NOW(), status = ? WHERE id = ?',
      [reason || 'Retour client', 'return_requested', orderId]
    );

    // Incrémenter le compteur de retours du client
    await pool.query(
      'UPDATE users SET returns_count = returns_count + 1 WHERE id = ?',
      [order.customer_id]
    );

    console.log('✅ Retour enregistré avec succès');
    console.log('📊 Compteur de retours incrémenté pour le client:', order.customer_id);

    res.json({ message: 'Retour enregistré avec succès' });
  } catch (error) {
    console.error('❌ Erreur enregistrement retour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update order status (requires active subscription for shops)
router.put('/:id/status', auth, requireActiveSubscription, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
