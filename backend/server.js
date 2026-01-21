const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const cluster = require('cluster');
require('dotenv').config();

// ID du worker pour les logs (0 si pas en mode cluster)
const workerId = cluster.isWorker ? cluster.worker.id : 0;
const workerPrefix = cluster.isWorker ? `[W${workerId}]` : '';

// Import des middlewares de sécurité
const {
  rateLimit,
  authRateLimit,
  sanitizeInput,
  securityHeaders,
  requestSizeLimit,
  suspiciousActivityLogger,
  bruteForceProtection
} = require('./middleware/security');

const app = express();

// Trust proxy pour obtenir la vraie IP derrière un reverse proxy
app.set('trust proxy', 1);

// ===== MIDDLEWARES DE SÉCURITÉ =====

// Headers de sécurité (doit être en premier)
app.use(securityHeaders);

// Compression des réponses (performance)
app.use(compression({
  level: 6,
  threshold: 1024, // Compresser seulement si > 1KB
  filter: (req, res) => {
    // Ne pas compresser les streams vidéo
    if (req.path.includes('/uploads/videos')) return false;
    return compression.filter(req, res);
  }
}));

// Rate limiting global (augmenté pour le scroll des vidéos)
app.use(rateLimit(500)); // 500 requêtes/minute par IP

// Détection d'activité suspecte
app.use(suspiciousActivityLogger);

// Limite de taille des requêtes (500MB pour les vidéos)
app.use(requestSizeLimit('500mb'));

// CORS configuré
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight 24h
}));

// Parsing JSON avec limite
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitization des entrées
app.use(sanitizeInput);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve privacy policy and other static pages at root level
app.get('/privacy-policy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/child-safety.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'child-safety.html'));
});

app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', '.well-known', 'assetlinks.json'));
});

// Create upload directories
const fs = require('fs');
const uploadDirs = ['uploads/images', 'uploads/videos', 'uploads/verification', 'uploads/invoices'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ===== ROUTES =====

// Routes d'authentification avec rate limiting strict et protection brute force
app.use('/api/auth', authRateLimit, bruteForceProtection, require('./routes/auth'));
app.use('/api/auth', authRateLimit, require('./routes/google-auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/products', require('./routes/products'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notifications', require('./routes/notifications-debug'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/email-verification', require('./routes/email-verification'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/subscription-invoices', require('./routes/subscription-invoices'));
app.use('/api/payment-settings', require('./routes/payment-settings'));
app.use('/api/migrate', require('./routes/migrate'));
app.use('/api/app-version', require('./routes/app-version'));
app.use('/api/support', require('./routes/support'));

// Share routes - Landing pages pour deep linking
// API pour générer un lien de partage (optionnel, le frontend génère directement)
app.get('/api/share/video/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID invalide' });
  }
  const link = `/v/${id}`;
  res.json({ link, fullUrl: `${req.protocol}://${req.get('host')}${link}` });
});

app.get('/api/share/shop/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID invalide' });
  }
  const link = `/s/${id}`;
  res.json({ link, fullUrl: `${req.protocol}://${req.get('host')}${link}` });
});

// Routes de partage - redirection vers l'app ou page web
app.get('/v/:id', (req, res) => {
  // Servir la page HTML qui redirige vers l'app
  res.sendFile(path.join(__dirname, 'public', 'share-video.html'));
});

app.get('/s/:id', (req, res) => {
  // Servir la page HTML qui redirige vers l'app
  res.sendFile(path.join(__dirname, 'public', 'share-shop.html'));
});

// Health check avec infos de monitoring et cluster
app.get('/api/health', (req, res) => {
  const os = require('os');
  const memUsage = process.memoryUsage();
  
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
    },
    cluster: {
      isWorker: cluster.isWorker,
      workerId: workerId,
      pid: process.pid
    },
    system: {
      cpus: os.cpus().length,
      platform: os.platform(),
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
      totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB'
    },
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler global (ne pas exposer les détails en production)
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Logger l'erreur
  console.error(`❌ [${new Date().toISOString()}] Erreur:`, {
    message: err.message,
    stack: isDev ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Réponse sécurisée
  res.status(err.status || 500).json({ 
    error: isDev ? err.message : 'Erreur serveur',
    ...(isDev && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.SERVER_IP || '0.0.0.0';

// Gestion propre de l'arrêt du serveur
const server = app.listen(PORT, HOST, () => {
  console.log(`${workerPrefix} ✅ Server running on http://${HOST}:${PORT}`);
  if (!cluster.isWorker) {
    console.log(`📁 Uploads available at http://${HOST}:${PORT}/uploads`);
    console.log(`🔗 API available at http://${HOST}:${PORT}/api`);
    console.log(`🛡️ Sécurité: Rate limiting, Headers sécurisés, Protection brute force activés`);
    console.log(`⚡ Optimisation: Compression, Pool DB optimisé activés`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur non capturée:', err);
  // Ne pas quitter en production, logger seulement
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejetée non gérée:', reason);
});
