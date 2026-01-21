/**
 * Middleware de sécurité pour le serveur Express
 * Protection contre les attaques courantes
 */

// Rate limiting en mémoire (simple, pour production utiliser Redis)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 500; // 500 requêtes par minute par IP (augmenté pour le scroll)
const RATE_LIMIT_MAX_AUTH = 10; // 10 tentatives d'auth par minute

// Nettoyer le store périodiquement
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Rate limiter général
 */
function rateLimit(maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `general:${ip}`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
      record = { count: 1, windowStart: now };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }
    
    // Ajouter les headers de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.windowStart + RATE_LIMIT_WINDOW) / 1000));
    
    if (record.count > maxRequests) {
      console.warn(`⚠️ Rate limit dépassé pour IP: ${ip}`);
      return res.status(429).json({ 
        error: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Rate limiter strict pour l'authentification
 */
function authRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `auth:${ip}`;
  const now = Date.now();
  
  let record = rateLimitStore.get(key);
  
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    record = { count: 1, windowStart: now };
    rateLimitStore.set(key, record);
  } else {
    record.count++;
  }
  
  if (record.count > RATE_LIMIT_MAX_AUTH) {
    console.warn(`⚠️ Tentatives d'auth excessives pour IP: ${ip}`);
    return res.status(429).json({ 
      error: 'Trop de tentatives de connexion, veuillez réessayer dans quelques minutes',
      retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  next();
}

/**
 * Protection contre les injections SQL et XSS basique
 */
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Supprimer les caractères dangereux pour SQL injection
      return obj
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caractères de contrôle
        .trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Vérifier les clés suspectes
        if (typeof key === 'string' && key.length < 100) {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
}

/**
 * Headers de sécurité (alternative légère à helmet)
 */
function securityHeaders(req, res, next) {
  // Protection XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Empêcher le sniffing MIME
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Empêcher le clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Politique de référent
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Supprimer le header X-Powered-By
  res.removeHeader('X-Powered-By');
  
  // Content Security Policy basique
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  
  // Strict Transport Security (pour HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

/**
 * Validation de la taille des requêtes
 */
function requestSizeLimit(maxSize = '10mb') {
  const maxBytes = parseSize(maxSize);
  
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxBytes) {
      return res.status(413).json({ error: 'Requête trop volumineuse' });
    }
    
    next();
  };
}

function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 10 * 1024 * 1024; // 10MB par défaut
  return parseInt(match[1]) * (units[match[2]] || 1);
}

/**
 * Logging des requêtes suspectes
 */
function suspiciousActivityLogger(req, res, next) {
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,           // Path traversal
    /<script/i,              // XSS
    /union\s+select/i,       // SQL injection
    /;\s*drop\s+table/i,     // SQL injection
    /eval\s*\(/i,            // Code injection
    /javascript:/i,          // XSS
    /on\w+\s*=/i,            // Event handlers XSS
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const isSuspicious = 
    checkValue(req.url) ||
    checkValue(JSON.stringify(req.body)) ||
    checkValue(JSON.stringify(req.query));
  
  if (isSuspicious) {
    const ip = req.ip || req.connection.remoteAddress;
    console.warn(`🚨 Activité suspecte détectée - IP: ${ip}, URL: ${req.url}`);
    
    // Optionnel: bloquer la requête
    // return res.status(400).json({ error: 'Requête invalide' });
  }
  
  next();
}

/**
 * CORS configuré de manière sécurisée
 */
function secureCors(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // En développement, autoriser localhost
    const isDev = process.env.NODE_ENV !== 'production';
    const isAllowed = isDev || 
      !origin || 
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*');
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24h cache preflight
    }
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * Protection contre les attaques par force brute sur les endpoints sensibles
 */
const bruteForceStore = new Map();
const BRUTE_FORCE_MAX_ATTEMPTS = 5;
const BRUTE_FORCE_LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function bruteForceProtection(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const email = req.body?.email?.toLowerCase() || '';
  const key = `brute:${ip}:${email}`;
  const now = Date.now();
  
  let record = bruteForceStore.get(key);
  
  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remainingTime = Math.ceil((record.lockedUntil - now) / 1000 / 60);
    return res.status(429).json({ 
      error: `Compte temporairement bloqué. Réessayez dans ${remainingTime} minutes.`
    });
  }
  
  // Réinitialiser après le lockout
  if (record && record.lockedUntil && now >= record.lockedUntil) {
    bruteForceStore.delete(key);
    record = null;
  }
  
  // Stocker pour vérification après la réponse
  res.on('finish', () => {
    if (res.statusCode === 401) {
      let rec = bruteForceStore.get(key) || { attempts: 0 };
      rec.attempts++;
      rec.lastAttempt = now;
      
      if (rec.attempts >= BRUTE_FORCE_MAX_ATTEMPTS) {
        rec.lockedUntil = now + BRUTE_FORCE_LOCKOUT_TIME;
        console.warn(`🔒 Compte bloqué pour force brute - IP: ${ip}, Email: ${email}`);
      }
      
      bruteForceStore.set(key, rec);
    } else if (res.statusCode === 200) {
      // Réinitialiser en cas de succès
      bruteForceStore.delete(key);
    }
  });
  
  next();
}

// Nettoyer le store de brute force périodiquement
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of bruteForceStore.entries()) {
    if (value.lockedUntil && now > value.lockedUntil + BRUTE_FORCE_LOCKOUT_TIME) {
      bruteForceStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Toutes les 5 minutes

module.exports = {
  rateLimit,
  authRateLimit,
  sanitizeInput,
  securityHeaders,
  requestSizeLimit,
  suspiciousActivityLogger,
  secureCors,
  bruteForceProtection
};
