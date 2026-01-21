const nodemailer = require('nodemailer');

// Configuration de l'email avec Hostinger
// Serveur SMTP: mail.buysdz.com port 465 avec SSL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.buysdz.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // SSL pour port 465
  auth: {
    user: process.env.EMAIL_USER || 'support@buysdz.com',
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Timeout plus long
  connectionTimeout: 30000, // 30 secondes
  greetingTimeout: 30000,
  socketTimeout: 60000
});

// Vérifier la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erreur connexion SMTP:', error.message);
    console.log('💡 Vérifiez EMAIL_PASSWORD dans les variables d\'environnement');
  } else {
    console.log('✅ Serveur SMTP prêt à envoyer des emails');
  }
});

/**
 * Générer un code de vérification à 6 chiffres
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Traductions pour les emails
 */
const translations = {
  fr: {
    verification: {
      subject: 'Code de vérification - Buys DZ',
      title: 'Vérification de votre compte',
      greeting: 'Bonjour',
      intro: 'Merci de vous être inscrit sur <strong>Buys DZ</strong>, la marketplace algérienne.',
      codeLabel: 'Votre code de vérification',
      instruction: 'Entrez ce code dans l\'application pour activer votre compte.',
      warning: 'Important :',
      expiry: 'Ce code expire dans <strong>24 heures</strong>.',
      ignore: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.',
      footer: 'Marketplace Algérienne',
      autoMessage: 'Cet email a été envoyé automatiquement, merci de ne pas y répondre.'
    },
    welcome: {
      subject: 'Bienvenue sur Buys DZ ! 🎉',
      title: 'Bienvenue !',
      greeting: 'Bonjour',
      intro: 'Votre email a été vérifié avec succès ! Vous pouvez maintenant profiter de toutes les fonctionnalités de Buys DZ :',
      features: [
        '📱 Découvrir des produits via des vidéos',
        '🛒 Commander facilement',
        '💬 Contacter les boutiques',
        '⭐ Laisser des avis'
      ],
      help: 'Besoin d\'aide ? Contactez-nous à'
    },
    passwordReset: {
      subject: 'Réinitialisation de mot de passe - Buys DZ',
      title: 'Réinitialisation de mot de passe',
      greeting: 'Bonjour',
      intro: 'Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :',
      codeLabel: 'Code de réinitialisation',
      instruction: 'Entrez ce code dans l\'application pour créer un nouveau mot de passe.',
      warning: 'Important :',
      expiry: 'Ce code expire dans <strong>15 minutes</strong>.',
      ignore: 'Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.',
      footer: 'Marketplace Algérienne',
      autoMessage: 'Cet email a été envoyé automatiquement, merci de ne pas y répondre.'
    }
  },
  ar: {
    verification: {
      subject: 'رمز التحقق - Buys DZ',
      title: 'التحقق من حسابك',
      greeting: 'مرحبا',
      intro: 'شكرا لتسجيلك في <strong>Buys DZ</strong>، السوق الجزائري.',
      codeLabel: 'رمز التحقق الخاص بك',
      instruction: 'أدخل هذا الرمز في التطبيق لتفعيل حسابك.',
      warning: 'مهم:',
      expiry: 'ينتهي صلاحية هذا الرمز خلال <strong>24 ساعة</strong>.',
      ignore: 'إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.',
      footer: 'السوق الجزائري',
      autoMessage: 'تم إرسال هذا البريد الإلكتروني تلقائيًا، يرجى عدم الرد عليه.'
    },
    welcome: {
      subject: 'مرحبا بك في Buys DZ! 🎉',
      title: 'مرحبا بك!',
      greeting: 'مرحبا',
      intro: 'تم التحقق من بريدك الإلكتروني بنجاح! يمكنك الآن الاستمتاع بجميع ميزات Buys DZ:',
      features: [
        '📱 اكتشف المنتجات عبر الفيديو',
        '🛒 اطلب بسهولة',
        '💬 تواصل مع المتاجر',
        '⭐ اترك تقييمات'
      ],
      help: 'تحتاج مساعدة؟ اتصل بنا على'
    },
    passwordReset: {
      subject: 'إعادة تعيين كلمة المرور - Buys DZ',
      title: 'إعادة تعيين كلمة المرور',
      greeting: 'مرحبا',
      intro: 'لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. إليك رمز التحقق:',
      codeLabel: 'رمز إعادة التعيين',
      instruction: 'أدخل هذا الرمز في التطبيق لإنشاء كلمة مرور جديدة.',
      warning: 'مهم:',
      expiry: 'ينتهي صلاحية هذا الرمز خلال <strong>15 دقيقة</strong>.',
      ignore: 'إذا لم تطلب إعادة التعيين، تجاهل هذا البريد. ستبقى كلمة المرور كما هي.',
      footer: 'السوق الجزائري',
      autoMessage: 'تم إرسال هذا البريد تلقائيًا، يرجى عدم الرد عليه.'
    }
  },
  en: {
    verification: {
      subject: 'Verification Code - Buys DZ',
      title: 'Account Verification',
      greeting: 'Hello',
      intro: 'Thank you for signing up on <strong>Buys DZ</strong>, the Algerian marketplace.',
      codeLabel: 'Your verification code',
      instruction: 'Enter this code in the app to activate your account.',
      warning: 'Important:',
      expiry: 'This code expires in <strong>24 hours</strong>.',
      ignore: 'If you didn\'t create an account, you can safely ignore this email.',
      footer: 'Algerian Marketplace',
      autoMessage: 'This email was sent automatically, please do not reply.'
    },
    welcome: {
      subject: 'Welcome to Buys DZ! 🎉',
      title: 'Welcome!',
      greeting: 'Hello',
      intro: 'Your email has been successfully verified! You can now enjoy all Buys DZ features:',
      features: [
        '📱 Discover products via videos',
        '🛒 Order easily',
        '💬 Contact shops',
        '⭐ Leave reviews'
      ],
      help: 'Need help? Contact us at'
    },
    passwordReset: {
      subject: 'Password Reset - Buys DZ',
      title: 'Password Reset',
      greeting: 'Hello',
      intro: 'You requested to reset your password. Here is your verification code:',
      codeLabel: 'Reset code',
      instruction: 'Enter this code in the app to create a new password.',
      warning: 'Important:',
      expiry: 'This code expires in <strong>15 minutes</strong>.',
      ignore: 'If you didn\'t request this reset, ignore this email. Your password will remain unchanged.',
      footer: 'Algerian Marketplace',
      autoMessage: 'This email was sent automatically, please do not reply.'
    }
  }
};

/**
 * Envoyer un code de vérification par email
 */
async function sendVerificationCode(email, name, code, language = 'fr') {
  // Valider la langue
  const lang = ['fr', 'ar', 'en'].includes(language) ? language : 'fr';
  const t = translations[lang].verification;
  const isRTL = lang === 'ar';
  const logoUrl = `${process.env.API_URL || 'http://localhost:3000'}/Logo.png`;
  
  const mailOptions = {
    from: '"Buys DZ" <support@buysdz.com>',
    to: email,
    replyTo: 'support@buysdz.com',
    subject: t.subject,
    // Version texte pour les clients email qui n'affichent pas le HTML
    text: `${t.greeting} ${name},\n\n${t.intro.replace(/<[^>]*>/g, '')}\n\n${t.codeLabel}: ${code}\n\n${t.warning} ${t.expiry.replace(/<[^>]*>/g, '')}\n\n${t.ignore}\n\nBuys DZ\nsupport@buysdz.com`,
    // En-têtes pour améliorer la délivrabilité
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'Buys DZ Mailer',
      'List-Unsubscribe': '<mailto:support@buysdz.com?subject=unsubscribe>'
    },
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Code de vérification - Buys DZ</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .code-box { background: #f9f9f9; border: 2px dashed #ddd; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #000; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px !important; }
            .code { font-size: 28px !important; letter-spacing: 4px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #fff;">
                <!-- Header -->
                <tr>
                  <td class="header" style="background: #000; color: #fff; padding: 30px 20px; text-align: center;">
                    <img src="https://i.postimg.cc/2SvChcKf/Logo.png" alt="Buys DZ" width="150" style="display: block; margin: 0 auto 15px auto; max-width: 150px; height: auto;" />
                    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t.title}</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td class="content" style="padding: 40px 30px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <h2 style="color: #000; margin-top: 0; text-align: ${isRTL ? 'right' : 'left'};">${t.greeting} ${name},</h2>
                    <p style="margin: 15px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.intro}</p>
                    <p style="margin: 15px 0; text-align: ${isRTL ? 'right' : 'left'};">${lang === 'fr' ? 'Voici votre code de vérification :' : lang === 'ar' ? 'إليك رمز التحقق الخاص بك:' : 'Here is your verification code:'}</p>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="code-box" style="background: #f9f9f9; border: 2px dashed #ddd; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${t.codeLabel}</p>
                          <div class="code" style="font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #000; font-family: 'Courier New', monospace;">${code}</div>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="text-align: center; color: #666; margin: 20px 0;">${t.instruction}</p>
                    
                    <div class="warning" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">
                      <strong>⏰ ${t.warning}</strong> ${t.expiry}
                    </div>
                    
                    <p style="font-size: 13px; color: #999; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.ignore}</p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td class="footer" style="text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px;">
                    <p style="margin: 5px 0;">© 2024 Buys DZ - ${t.footer}</p>
                    <p style="margin: 5px 0;"><a href="mailto:support@buysdz.com" style="color: #666; text-decoration: none;">support@buysdz.com</a></p>
                    <p style="margin: 10px 0 5px 0; font-size: 11px;">${t.autoMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Code de vérification envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

/**
 * Envoyer un email de bienvenue après vérification
 */
async function sendWelcomeEmail(email, name, language = 'fr') {
  const lang = ['fr', 'ar', 'en'].includes(language) ? language : 'fr';
  const t = translations[lang].welcome;
  const isRTL = lang === 'ar';
  const logoUrl = `${process.env.API_URL || 'http://localhost:3000'}/Logo.png`;
  const mailOptions = {
    from: '"Buys DZ" <support@buysdz.com>',
    to: email,
    replyTo: 'support@buysdz.com',
    subject: t.subject,
    text: `${t.greeting} ${name},\n\n${t.intro}\n${t.features.join('\n')}\n\n${t.help} support@buysdz.com\n\nBuys DZ`,
    headers: {
      'X-Mailer': 'Buys DZ Mailer',
      'List-Unsubscribe': '<mailto:support@buysdz.com?subject=unsubscribe>'
    },
    html: `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.postimg.cc/2SvChcKf/Logo.png" alt="Buys DZ" width="150" style="display: block; margin: 0 auto 15px auto; max-width: 150px; height: auto;" />
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">🎉 ${t.title}</h1>
          </div>
          <div class="content" dir="${isRTL ? 'rtl' : 'ltr'}">
            <h2 style="color: #000; margin-top: 0; text-align: ${isRTL ? 'right' : 'left'};">${t.greeting} ${name},</h2>
            <p style="text-align: ${isRTL ? 'right' : 'left'};">${t.intro}</p>
            <ul style="line-height: 2; text-align: ${isRTL ? 'right' : 'left'};">
              ${t.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <p style="text-align: ${isRTL ? 'right' : 'left'};">${t.help} <strong>support@buysdz.com</strong></p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">© 2024 Buys DZ</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email de bienvenue envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

/**
 * Envoyer un code de réinitialisation de mot de passe
 */
async function sendPasswordResetCode(email, name, code, language = 'fr') {
  const lang = ['fr', 'ar', 'en'].includes(language) ? language : 'fr';
  const t = translations[lang].passwordReset;
  const isRTL = lang === 'ar';
  const logoUrl = `${process.env.API_URL || 'http://localhost:3000'}/Logo.png`;
  
  const mailOptions = {
    from: '"Buys DZ" <support@buysdz.com>',
    to: email,
    replyTo: 'support@buysdz.com',
    subject: t.subject,
    text: `${t.greeting} ${name},\n\n${t.intro}\n\n${t.codeLabel}: ${code}\n\n${t.warning} ${t.expiry}\n\n${t.ignore}\n\nBuys DZ\nsupport@buysdz.com`,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'Buys DZ Mailer',
      'List-Unsubscribe': '<mailto:support@buysdz.com?subject=unsubscribe>'
    },
    html: `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${t.subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #ef4444; color: #fff; padding: 30px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .code-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #ef4444; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px !important; }
            .code { font-size: 28px !important; letter-spacing: 4px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #fff;">
                <!-- Header -->
                <tr>
                  <td class="header" style="background: #ef4444; color: #fff; padding: 30px 20px; text-align: center;">
                    <img src="https://i.postimg.cc/2SvChcKf/Logo.png" alt="Buys DZ" width="150" style="display: block; margin: 0 auto 15px auto; max-width: 150px; height: auto;" />
                    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t.title}</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td class="content" style="padding: 40px 30px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <h2 style="color: #000; margin-top: 0; text-align: ${isRTL ? 'right' : 'left'};">${t.greeting} ${name},</h2>
                    <p style="margin: 15px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.intro}</p>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="code-box" style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${t.codeLabel}</p>
                          <div class="code" style="font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #ef4444; font-family: 'Courier New', monospace;">${code}</div>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="text-align: center; color: #666; margin: 20px 0;">${t.instruction}</p>
                    
                    <div class="warning" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">
                      <strong>⚠️ ${t.warning}</strong> ${t.expiry}
                    </div>
                    
                    <p style="font-size: 13px; color: #999; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.ignore}</p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td class="footer" style="text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px;">
                    <p style="margin: 5px 0;">© 2024 Buys DZ - ${t.footer}</p>
                    <p style="margin: 5px 0;"><a href="mailto:support@buysdz.com" style="color: #666; text-decoration: none;">support@buysdz.com</a></p>
                    <p style="margin: 10px 0 5px 0; font-size: 11px;">${t.autoMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Code de réinitialisation envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

/**
 * Envoyer un code de réinitialisation de mot de passe
 */
async function sendPasswordResetCode(email, name, code, language = 'fr') {
  const lang = ['fr', 'ar', 'en'].includes(language) ? language : 'fr';
  const t = translations[lang].passwordReset;
  const isRTL = lang === 'ar';
  const logoUrl = `${process.env.API_URL || 'http://localhost:3000'}/Logo.png`;
  
  const mailOptions = {
    from: '"Buys DZ" <support@buysdz.com>',
    to: email,
    replyTo: 'support@buysdz.com',
    subject: t.subject,
    text: `${t.greeting} ${name},\n\n${t.intro}\n\n${t.codeLabel}: ${code}\n\n${t.warning} ${t.expiry}\n\n${t.ignore}\n\nBuys DZ\nsupport@buysdz.com`,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'Buys DZ Mailer',
      'List-Unsubscribe': '<mailto:support@buysdz.com?subject=unsubscribe>'
    },
    html: `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #ef4444; color: #fff; padding: 30px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .code-box { background: #fef2f2; border: 2px dashed #ef4444; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
          .code { font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #dc2626; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #fff;">
                <tr>
                  <td style="background: #ef4444; color: #fff; padding: 30px 20px; text-align: center;">
                    <img src="https://i.postimg.cc/2SvChcKf/Logo.png" alt="Buys DZ" width="150" style="display: block; margin: 0 auto 15px auto; max-width: 150px; height: auto;" />
                    <p style="margin: 10px 0 0 0; font-size: 16px;">${t.title}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    <h2 style="color: #000; margin-top: 0; text-align: ${isRTL ? 'right' : 'left'};">${t.greeting} ${name},</h2>
                    <p style="margin: 15px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.intro}</p>
                    
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background: #fef2f2; border: 2px dashed #ef4444; border-radius: 8px; padding: 30px; text-align: center;">
                          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${t.codeLabel}</p>
                          <div style="font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #dc2626; font-family: 'Courier New', monospace;">${code}</div>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="text-align: center; color: #666; margin: 20px 0;">${t.instruction}</p>
                    
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">
                      <strong>⚠️ ${t.warning}</strong> ${t.expiry}
                    </div>
                    
                    <p style="font-size: 13px; color: #999; margin: 20px 0; text-align: ${isRTL ? 'right' : 'left'};">${t.ignore}</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 20px; background: #f9f9f9; color: #666; font-size: 12px;">
                    <p style="margin: 5px 0;">© 2024 Buys DZ</p>
                    <p style="margin: 5px 0;"><a href="mailto:support@buysdz.com" style="color: #666;">support@buysdz.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Code de réinitialisation envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
}

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendWelcomeEmail,
  sendPasswordResetCode
};
