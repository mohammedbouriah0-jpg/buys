const admin = require('firebase-admin');
const path = require('path');

// Initialiser Firebase Admin avec le fichier de credentials
const serviceAccountPath = path.join(__dirname, '..', 'fcm-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialisé');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  console.error('   Assurez-vous que le fichier fcm-service-account.json existe dans backend/');
}

/**
 * Vérifier si c'est un token FCM valide
 * @param {string} token - Token à vérifier
 */
function isValidFCMToken(token) {
  // Un token FCM est une longue chaîne (environ 150-200 caractères)
  // Ne commence PAS par "ExponentPushToken"
  return token && 
         typeof token === 'string' && 
         token.length > 50 && 
         !token.startsWith('ExponentPushToken');
}

/**
 * Envoyer une notification push à un utilisateur via FCM
 * @param {string} pushToken - Token FCM de l'utilisateur
 * @param {object} notification - Objet contenant title, body, data
 */
async function sendPushNotification(pushToken, notification) {
  // Vérifier que le token est valide
  if (!isValidFCMToken(pushToken)) {
    console.error(`Token FCM invalide: ${pushToken}`);
    return { success: false, error: 'Invalid FCM token' };
  }

  // Créer le message FCM
  const message = {
    token: pushToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data ? Object.fromEntries(
      Object.entries(notification.data).map(([k, v]) => [k, String(v)])
    ) : {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders',
        sound: 'default',
        icon: 'notification_icon',
        color: '#000000',
        imageUrl: 'https://i.postimg.cc/vHK1tm20/Logo3.png',
      },
    },
  };

  try {
    // Envoyer via Firebase Admin
    const response = await admin.messaging().send(message);
    console.log('✅ Notification FCM envoyée:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Erreur envoi FCM:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer des notifications à plusieurs utilisateurs via FCM
 * @param {Array} notifications - Tableau d'objets {pushToken, title, body, data}
 */
async function sendBatchPushNotifications(notifications) {
  const results = [];

  for (let notif of notifications) {
    if (!isValidFCMToken(notif.pushToken)) {
      console.error(`Token FCM invalide: ${notif.pushToken}`);
      results.push({ success: false, error: 'Invalid token' });
      continue;
    }

    try {
      const result = await sendPushNotification(notif.pushToken, {
        title: notif.title,
        body: notif.body,
        data: notif.data,
      });
      results.push(result);
    } catch (error) {
      console.error('❌ Erreur envoi batch:', error);
      results.push({ success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Envoyer une notification de nouvelle commande à une boutique
 * @param {number} shopId - ID de la boutique
 * @param {number} orderId - ID de la commande
 * @param {number} totalAmount - Montant total
 * @param {number} itemsCount - Nombre de produits
 * @param {object} pool - Pool de connexion à la base de données
 */
async function sendNewOrderNotification(shopId, orderId, totalAmount, itemsCount, pool) {
  try {
    console.log(`\n🔔 [NOTIF] Tentative notification pour commande #${orderId} → Boutique #${shopId}`);
    
    // Récupérer les infos du propriétaire de la boutique
    const [shops] = await pool.query(
      `SELECT u.push_token, u.push_enabled, u.email, u.name, s.shop_name
       FROM shops s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [shopId]
    );

    if (shops.length === 0) {
      console.log(`❌ [NOTIF] Boutique ${shopId} non trouvée`);
      return { success: false, reason: 'Shop not found' };
    }

    const shop = shops[0];
    console.log(`👤 [NOTIF] Vendeur: ${shop.name} (${shop.shop_name})`);
    console.log(`📧 [NOTIF] Email: ${shop.email || '❌ ABSENT'}`);
    console.log(`🔔 [NOTIF] Push Token: ${shop.push_token ? '✅ Présent' : '❌ ABSENT'}`);
    console.log(`🔔 [NOTIF] Push Enabled: ${shop.push_enabled ? '✅ Oui' : '❌ Non'}`);
    
    let pushSent = false;
    let emailSent = false;

    // 1. Essayer d'envoyer une notification push
    if (shop.push_enabled && shop.push_token && isValidFCMToken(shop.push_token)) {
      console.log(`📤 [NOTIF] Envoi notification push...`);
      try {
        const result = await sendPushNotification(shop.push_token, {
          title: ' Nouvelle commande !',
          body: `Commande #${orderId} - ${totalAmount.toFixed(2)} DA (${itemsCount} produit${itemsCount > 1 ? 's' : ''})`,
          data: {
            type: 'new_order',
            orderId: orderId,
            shopId: shopId,
            screen: 'OrderDetails',
          },
        });
        
        if (result.success) {
          console.log(`✅ [NOTIF] Notification push envoyée à ${shop.shop_name}`);
          pushSent = true;
        } else {
          console.log(`❌ [NOTIF] Échec envoi push:`, result.error);
        }
      } catch (pushError) {
        console.error(`❌ [NOTIF] Exception push:`, pushError.message);
      }
    } else {
      const reasons = [];
      if (!shop.push_enabled) reasons.push('push_enabled=false');
      if (!shop.push_token) reasons.push('pas de token');
      if (shop.push_token && !isValidFCMToken(shop.push_token)) reasons.push('token invalide');
      
      console.log(`⚠️ [NOTIF] Push non disponible: ${reasons.join(', ')}`);
    }

    // 2. Alternative : Envoyer un email si push échoue ou non disponible
    if (!pushSent && shop.email) {
      console.log(`📧 [NOTIF] Tentative envoi email à ${shop.email}...`);
      try {
        const nodemailer = require('nodemailer');
        
        // Utiliser le même transporter que email.js
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.hostinger.com',
          port: parseInt(process.env.SMTP_PORT) || 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER || 'support@buysdz.com',
            pass: process.env.EMAIL_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        await transporter.sendMail({
          from: `"Buys DZ" <${process.env.EMAIL_USER || 'support@buysdz.com'}>`,
          to: shop.email,
          subject: ' Nouvelle commande reçue !',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #000;">🎉 Nouvelle commande !</h2>
              <p>Bonjour ${shop.name},</p>
              <p>Vous avez reçu une nouvelle commande sur votre boutique <strong>${shop.shop_name}</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Numéro de commande :</strong> #${orderId}</p>
                <p style="margin: 5px 0;"><strong>Montant total :</strong> ${totalAmount.toFixed(2)} DA</p>
                <p style="margin: 5px 0;"><strong>Nombre de produits :</strong> ${itemsCount}</p>
              </div>
              
              <p>Connectez-vous à l'application pour voir les détails et gérer cette commande.</p>
              
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                💡 Astuce : Activez les notifications push dans l'application pour recevoir des alertes instantanées !
              </p>
            </div>
          `
        });
        
        console.log(`✅ [NOTIF] Email envoyé à ${shop.email}`);
        emailSent = true;
      } catch (emailError) {
        console.error(`❌ [NOTIF] Erreur email:`, emailError.message);
      }
    } else if (!pushSent && !shop.email) {
      console.log(`⚠️ [NOTIF] Pas d'email disponible pour fallback`);
    }

    const result = { 
      success: pushSent || emailSent, 
      pushSent, 
      emailSent,
      reason: !pushSent && !emailSent ? 'No notification method available' : undefined
    };
    
    if (result.success) {
      console.log(`✅ [NOTIF] Notification envoyée avec succès (push: ${pushSent}, email: ${emailSent})`);
    } else {
      console.log(`❌ [NOTIF] Aucune notification envoyée - L'utilisateur doit:`);
      console.log(`   1. Se connecter à l'app pour enregistrer son token push`);
      console.log(`   2. Ou avoir un email valide en base de données`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [NOTIF] Exception:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendBatchPushNotifications,
  sendNewOrderNotification,
};
