const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, isShop, requireActiveSubscription } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { buildFullUrl } = require('../utils/url-helper');
const bunnyCdn = require('../services/bunny-cdn');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, shop_id, search } = req.query;
    let query = `
      SELECT 
        p.*, 
        s.shop_name, 
        s.verified, 
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url,
        /* effective_stock: if variants exist, use sum of variant stock, else product stock */
        CASE 
          WHEN p.has_variants = 1 THEN (
            SELECT COALESCE(SUM(v.stock), 0) 
            FROM product_variants v 
            WHERE v.product_id = p.id
          )
          ELSE p.stock
        END as effective_stock
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    if (shop_id) {
      query += ' AND p.shop_id = ?';
      params.push(shop_id);
    }

    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    const [products] = await pool.query(query, params);
    
    // Convertir les URLs d'images (utiliser primary_image_url si disponible, sinon image_url de products)
    const productsWithUrls = products.map(product => {
      const imageUrl = product.primary_image_url || product.image_url;
      return {
        ...product,
        // stock effectif : soit le stock total des variantes, soit le stock de base
        stock: product.effective_stock,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        primary_image_url: undefined,
        effective_stock: undefined,
      };
    });
    
    res.json(productsWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Search products - endpoint optimisé pour la recherche
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ products: [], total: 0 });
    }

    const searchTerm = `%${q}%`;
    
    // Recherche dans le nom et la description
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.price, p.description, 
             s.shop_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE p.name LIKE ? OR p.description LIKE ?
      ORDER BY 
        CASE WHEN p.name LIKE ? THEN 0 ELSE 1 END,
        p.created_at DESC
      LIMIT ? OFFSET ?
    `, [searchTerm, searchTerm, `${q}%`, parseInt(limit), parseInt(offset)]);
    
    // Convertir les URLs d'images
    const productsWithUrls = products.map(product => ({
      ...product,
      image_url: product.image_url ? buildFullUrl(product.image_url, req) : null
    }));

    // Compter le total
    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) as total FROM products p
      WHERE p.name LIKE ? OR p.description LIKE ?
    `, [searchTerm, searchTerm]);
    
    res.json({ products: productsWithUrls, total });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get trending data - basé sur les vraies statistiques
router.get('/trending', async (req, res) => {
  try {
    // 1. Produits les plus commandés (populaires)
    const [popularProducts] = await pool.query(`
      SELECT p.name, COUNT(oi.id) as order_count
      FROM products p
      INNER JOIN order_items oi ON oi.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY order_count DESC
      LIMIT 5
    `);

    // 2. Catégories les plus populaires (par nombre de produits commandés)
    const [popularCategories] = await pool.query(`
      SELECT c.name, c.icon, COUNT(oi.id) as order_count
      FROM categories c
      INNER JOIN products p ON p.category_id = c.id
      INNER JOIN order_items oi ON oi.product_id = p.id
      GROUP BY c.id, c.name, c.icon
      ORDER BY order_count DESC
      LIMIT 6
    `);

    // 3. Boutiques les plus populaires (par abonnés)
    const [popularShops] = await pool.query(`
      SELECT s.shop_name, COUNT(sub.id) as subscribers_count
      FROM shops s
      LEFT JOIN subscriptions sub ON sub.shop_id = s.id
      GROUP BY s.id, s.shop_name
      ORDER BY subscribers_count DESC
      LIMIT 5
    `);

    // 4. Si pas assez de données de commandes, prendre les produits récents les plus vus
    let trendingSearches = popularProducts.map(p => p.name);
    
    if (trendingSearches.length < 3) {
      // Fallback: produits récents
      const [recentProducts] = await pool.query(`
        SELECT name FROM products 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      trendingSearches = recentProducts.map(p => p.name);
    }

    // 5. Catégories avec fallback
    let categories = popularCategories.map(c => ({
      name: c.name,
      icon: c.icon || '📦'
    }));
    
    if (categories.length < 3) {
      // Fallback: toutes les catégories
      const [allCategories] = await pool.query(`
        SELECT name, icon FROM categories LIMIT 6
      `);
      categories = allCategories.map(c => ({
        name: c.name,
        icon: c.icon || '📦'
      }));
    }

    res.json({
      trendingSearches,
      popularCategories: categories,
      popularShops: popularShops.map(s => s.shop_name),
      hasEnoughData: popularProducts.length >= 3
    });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ PRODUCT LIKES ============

// Get my liked products
router.get('/my-likes', auth, async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.price, p.description, s.shop_name, s.id as shop_id,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url,
             pl.created_at as liked_at
      FROM product_likes pl
      INNER JOIN products p ON p.id = pl.product_id
      LEFT JOIN shops s ON s.id = p.shop_id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC
    `, [req.user.id]);
    
    // Convertir les URLs
    const productsWithUrls = products.map(product => ({
      ...product,
      image_url: product.image_url ? buildFullUrl(product.image_url, req) : null
    }));
    
    res.json(productsWithUrls);
  } catch (error) {
    console.error('Error fetching liked products:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Like a product
router.post('/:id/like', auth, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Vérifier que le produit existe
    const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    // Vérifier si déjà liké
    const [existing] = await pool.query(
      'SELECT id FROM product_likes WHERE product_id = ? AND user_id = ?',
      [productId, req.user.id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Produit déjà liké' });
    }
    
    // Ajouter le like
    await pool.query(
      'INSERT INTO product_likes (product_id, user_id) VALUES (?, ?)',
      [productId, req.user.id]
    );
    
    // Compter les likes
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM product_likes WHERE product_id = ?',
      [productId]
    );
    
    res.json({ success: true, liked: true, likes_count: count });
  } catch (error) {
    console.error('Error liking product:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Unlike a product
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const productId = req.params.id;
    
    await pool.query(
      'DELETE FROM product_likes WHERE product_id = ? AND user_id = ?',
      [productId, req.user.id]
    );
    
    // Compter les likes
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM product_likes WHERE product_id = ?',
      [productId]
    );
    
    res.json({ success: true, liked: false, likes_count: count });
  } catch (error) {
    console.error('Error unliking product:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Check if product is liked
router.get('/:id/liked', auth, async (req, res) => {
  try {
    const productId = req.params.id;
    
    const [likes] = await pool.query(
      'SELECT id FROM product_likes WHERE product_id = ? AND user_id = ?',
      [productId, req.user.id]
    );
    
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM product_likes WHERE product_id = ?',
      [productId]
    );
    
    res.json({ liked: likes.length > 0, likes_count: count });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get my products (shop only - requires active subscription)
router.get('/my-products', auth, requireActiveSubscription, async (req, res) => {
  try {
    // Get shop_id
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    const [products] = await pool.query(`
      SELECT 
        p.*, 
        c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image_url,
        CASE 
          WHEN p.has_variants = 1 THEN (
            SELECT COALESCE(SUM(v.stock), 0) 
            FROM product_variants v 
            WHERE v.product_id = p.id
          )
          ELSE p.stock
        END as effective_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = ?
      ORDER BY p.created_at DESC
    `, [shopId]);
    
    // Convertir les URLs d'images
    const productsWithUrls = products.map(product => {
      const imageUrl = product.primary_image_url || product.image_url;
      return {
        ...product,
        stock: product.effective_stock,
        image_url: imageUrl ? buildFullUrl(imageUrl, req) : null,
        primary_image_url: undefined,
        effective_stock: undefined,
      };
    });
    
    res.json(productsWithUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, s.shop_name, s.verified, s.user_id as shop_user_id, s.logo_url as shop_logo, c.name as category_name
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const product = products[0];

    // Get all images
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC',
      [req.params.id]
    );

    // Convertir les URLs d'images
    product.images = images.map(img => ({
      ...img,
      image_url: buildFullUrl(img.image_url, req)
    }));

    // Convertir le logo de la boutique
    product.shop_logo = product.shop_logo ? buildFullUrl(product.shop_logo, req) : null;

    // 🔍 DEBUG: Log product info
    console.log('📦 Product ID:', req.params.id);
    console.log('📦 Product Name:', product.name);
    console.log('📦 Has Variants:', product.has_variants);

    // Get variants if product has them
    if (product.has_variants) {
      console.log('🔍 Fetching variants for product', req.params.id);
      const [variants] = await pool.query(
        'SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color',
        [req.params.id]
      );
      console.log('✅ Variants found:', variants.length);
      console.log('📋 Variants data:', JSON.stringify(variants, null, 2));
      product.variants = variants;
    } else {
      console.log('⚠️ Product has no variants (has_variants = 0 or null)');
    }

    console.log('📤 Sending product with variants:', product.variants ? product.variants.length : 0);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create product (shop only - requires active subscription)
router.post('/', auth, requireActiveSubscription, upload.array('images', 5), async (req, res) => {
  try {
    // 🔍 DEBUG: Log request body
    console.log('📥 CREATE PRODUCT REQUEST');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files ? req.files.length : 0);
    
    // Vérifier si la boutique est vérifiée
    const [userCheck] = await pool.query(
      "SELECT is_verified FROM users WHERE id = ?",
      [req.user.id]
    );
    
    if (userCheck.length === 0 || !userCheck[0].is_verified) {
      return res.status(403).json({ 
        error: "Boutique non vérifiée",
        message: "Votre boutique doit être vérifiée pour ajouter des produits",
        verification_required: true
      });
    }

    const { name, description, price, category_id, stock, has_variants, variants } = req.body;
    
    // 🔍 DEBUG: Log variants info
    console.log('📦 Has Variants:', has_variants);
    console.log('📋 Variants:', variants);

    // Get shop_id
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    // Insert product
    // Convertir has_variants en booléen (peut être "true", "false", true, false, 1, 0)
    const hasVariantsBool = has_variants === true || has_variants === 'true' || has_variants === 1 || has_variants === '1';
    
    // Convertir category_id vide en NULL
    const categoryIdValue = category_id && category_id !== '' ? category_id : null;
    
    const [result] = await pool.query(
      'INSERT INTO products (shop_id, name, description, price, category_id, stock, has_variants) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shopId, name, description, price, categoryIdValue, stock || 0, hasVariantsBool ? 1 : 0]
    );

    const productId = result.insertId;
    console.log('✅ Product created with ID:', productId);
    
    // Add variants if provided
    if (has_variants && variants) {
      console.log('🔍 Processing variants...');
      try {
        const variantsArray = typeof variants === 'string' ? JSON.parse(variants) : variants;
        console.log('📋 Parsed variants:', JSON.stringify(variantsArray, null, 2));
        
        if (Array.isArray(variantsArray) && variantsArray.length > 0) {
          const variantValues = variantsArray.map(v => [
            productId, 
            v.size || null, 
            v.color || null, 
            parseInt(v.stock) || 0
          ]);
          
          console.log('💾 Inserting variants:', JSON.stringify(variantValues, null, 2));
          
          await pool.query(
            'INSERT INTO product_variants (product_id, size, color, stock) VALUES ?',
            [variantValues]
          );
          
          console.log('✅ Variants inserted successfully');
        } else {
          console.log('⚠️ No variants to insert (empty array)');
        }
      } catch (variantError) {
        console.error('❌ Error processing variants:', variantError);
        console.error('Variants data:', variants);
      }
    } else {
      console.log('ℹ️ No variants for this product');
    }

    // Insert images (upload sur BunnyCDN si configuré)
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        let imageUrl;
        try {
          if (bunnyCdn.isConfigured()) {
            imageUrl = await bunnyCdn.uploadMulterFile(req.files[i], 'images');
            console.log(`✅ Image produit uploadée sur BunnyCDN: ${imageUrl}`);
          } else {
            imageUrl = `/uploads/images/${req.files[i].filename}`;
          }
        } catch (uploadError) {
          console.error(`❌ Erreur upload image produit:`, uploadError.message);
          imageUrl = `/uploads/images/${req.files[i].filename}`;
        }
        
        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [productId, imageUrl, i === 0]
        );
      }
    }

    res.status(201).json({ id: productId, message: 'Produit créé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update product (requires active subscription)
router.put('/:id', auth, requireActiveSubscription, upload.array('images', 5), async (req, res) => {
  try {
    // Vérifier si la boutique est vérifiée
    const [userCheck] = await pool.query(
      "SELECT is_verified FROM users WHERE id = ?",
      [req.user.id]
    );
    
    if (userCheck.length === 0 || !userCheck[0].is_verified) {
      return res.status(403).json({ 
        error: "Boutique non vérifiée",
        message: "Votre boutique doit être vérifiée pour modifier des produits",
        verification_required: true
      });
    }

    const { name, description, price, category_id, stock, has_variants, variants } = req.body;
    
    // IMPORTANT: has_variants vient comme string "true"/"false" du FormData
    const hasVariantsBool = has_variants === 'true' || has_variants === true;
    
    console.log('📝 UPDATE PRODUCT REQUEST');
    console.log('Product ID:', req.params.id);
    console.log('has_variants raw:', has_variants, '-> parsed:', hasVariantsBool);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Verify ownership
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    const shopId = shops[0].id;

    const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND shop_id = ?', [req.params.id, shopId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Build update query dynamically to only update provided fields
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(category_id && category_id !== '' ? category_id : null);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      values.push(stock);
    }
    if (has_variants !== undefined) {
      updates.push('has_variants = ?');
      values.push(hasVariantsBool ? 1 : 0);
    }
    
    if (updates.length > 0) {
      values.push(req.params.id);
      await pool.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      console.log('✅ Product updated:', updates.join(', '));
    }
    
    // Update variants if provided
    if (hasVariantsBool && variants) {
      console.log('🔍 Processing variants update...');
      try {
        const variantsArray = typeof variants === 'string' ? JSON.parse(variants) : variants;
        console.log('📋 Parsed variants:', JSON.stringify(variantsArray, null, 2));
        
        // Delete all existing variants
        await pool.query('DELETE FROM product_variants WHERE product_id = ?', [req.params.id]);
        console.log('🗑️ Deleted old variants');
        
        // Insert new variants
        if (Array.isArray(variantsArray) && variantsArray.length > 0) {
          const variantValues = variantsArray.map(v => [
            req.params.id,
            v.size || null,
            v.color || null,
            parseInt(v.stock) || 0
          ]);
          
          console.log('💾 Inserting new variants:', JSON.stringify(variantValues, null, 2));
          
          await pool.query(
            'INSERT INTO product_variants (product_id, size, color, stock) VALUES ?',
            [variantValues]
          );
          
          console.log('✅ Variants updated successfully');
        }
      } catch (variantError) {
        console.error('❌ Error updating variants:', variantError);
      }
    } else if (has_variants !== undefined && !hasVariantsBool) {
      // If variants explicitly disabled, delete all variants
      console.log('🗑️ Deleting all variants (has_variants = false)');
      await pool.query('DELETE FROM product_variants WHERE product_id = ?', [req.params.id]);
    }
    
    // Handle image upload if provided (upload sur BunnyCDN si configuré)
    if (req.files && req.files.length > 0) {
      console.log('📸 Updating product images...');
      
      // Récupérer les anciennes images pour les supprimer de BunnyCDN
      const [oldImages] = await pool.query('SELECT image_url FROM product_images WHERE product_id = ?', [req.params.id]);
      
      // Supprimer les anciennes images de BunnyCDN
      for (const img of oldImages) {
        if (img.image_url && bunnyCdn.isBunnyCdnUrl(img.image_url)) {
          try {
            await bunnyCdn.deleteFile(img.image_url);
            console.log(`🗑️ Image BunnyCDN supprimée: ${img.image_url}`);
          } catch (err) {
            console.warn(`⚠️ Erreur suppression image: ${err.message}`);
          }
        }
      }
      
      // Delete old images from DB
      await pool.query('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
      
      // Insert new images
      for (let i = 0; i < req.files.length; i++) {
        let imageUrl;
        try {
          if (bunnyCdn.isConfigured()) {
            imageUrl = await bunnyCdn.uploadMulterFile(req.files[i], 'images');
            console.log(`✅ Image produit uploadée sur BunnyCDN: ${imageUrl}`);
          } else {
            imageUrl = `/uploads/images/${req.files[i].filename}`;
          }
        } catch (uploadError) {
          console.error(`❌ Erreur upload image:`, uploadError.message);
          imageUrl = `/uploads/images/${req.files[i].filename}`;
        }
        
        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [req.params.id, imageUrl, i === 0]
        );
      }
      console.log('✅ Images updated');
    }

    res.json({ message: 'Produit mis à jour' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete product (requires active subscription)
router.delete('/:id', auth, requireActiveSubscription, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    const shopId = shops[0].id;

    const [result] = await pool.query('DELETE FROM products WHERE id = ? AND shop_id = ?', [req.params.id, shopId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get product variants
router.get('/:id/variants', async (req, res) => {
  try {
    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY size, color',
      [req.params.id]
    );
    res.json(variants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Add product variants (requires active subscription)
router.post('/:id/variants', auth, requireActiveSubscription, async (req, res) => {
  try {
    const { variants } = req.body; // Array of {size, color, stock}
    
    // Verify ownership
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    const shopId = shops[0].id;
    
    const [products] = await pool.query('SELECT * FROM products WHERE id = ? AND shop_id = ?', [req.params.id, shopId]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    
    // Delete existing variants
    await pool.query('DELETE FROM product_variants WHERE product_id = ?', [req.params.id]);
    
    // Insert new variants
    if (variants && variants.length > 0) {
      const values = variants.map(v => [req.params.id, v.size, v.color, v.stock || 0]);
      await pool.query(
        'INSERT INTO product_variants (product_id, size, color, stock) VALUES ?',
        [values]
      );
      
      // Mark product as having variants
      await pool.query('UPDATE products SET has_variants = 1 WHERE id = ?', [req.params.id]);
    } else {
      await pool.query('UPDATE products SET has_variants = 0 WHERE id = ?', [req.params.id]);
    }
    
    res.json({ message: 'Variantes enregistrées' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
