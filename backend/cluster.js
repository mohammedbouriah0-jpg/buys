/**
 * Cluster Node.js - 8 workers par défaut
 * Point d'entrée principal pour la production
 * 
 * Usage: node cluster.js
 * Ou: CLUSTER_WORKERS=4 node cluster.js (pour changer le nombre)
 */

const cluster = require('cluster');
const os = require('os');

// Nombre de workers (8 par défaut, ou variable d'environnement)
const numCPUs = parseInt(process.env.CLUSTER_WORKERS) || 8;

// Configuration
const WORKER_RESTART_DELAY = 1000; // Délai avant restart d'un worker crashé
const MAX_RESTARTS_PER_MINUTE = 5; // Max restarts pour éviter les boucles infinies

// Tracking des restarts
let restartsInLastMinute = 0;
setInterval(() => { restartsInLastMinute = 0; }, 60000);

if (cluster.isMaster) {
  // ===== PROCESSUS MASTER =====
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    BUYS API SERVER                         ║');
  console.log('║                    Cluster Mode                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ 🖥️  Master PID: ${process.pid.toString().padEnd(43)}║`);
  console.log(`║ 💻 CPUs système: ${os.cpus().length.toString().padEnd(42)}║`);
  console.log(`║ 👷 Workers configurés: ${numCPUs.toString().padEnd(36)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Fork un worker pour chaque CPU
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`🚀 Worker ${worker.id} lancé (PID: ${worker.process.pid})`);
  }

  // Gestion de la mort d'un worker
  cluster.on('exit', (worker, code, signal) => {
    const exitReason = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`💀 Worker ${worker.id} (PID: ${worker.process.pid}) mort - ${exitReason}`);
    
    // Vérifier si on ne restart pas trop souvent
    if (restartsInLastMinute >= MAX_RESTARTS_PER_MINUTE) {
      console.error('❌ Trop de restarts en 1 minute, arrêt du cluster');
      process.exit(1);
    }
    
    // Restart le worker après un délai
    restartsInLastMinute++;
    console.log(`⏳ Redémarrage du worker dans ${WORKER_RESTART_DELAY}ms...`);
    
    setTimeout(() => {
      const newWorker = cluster.fork();
      console.log(`🔄 Nouveau worker ${newWorker.id} lancé (PID: ${newWorker.process.pid})`);
    }, WORKER_RESTART_DELAY);
  });

  // Gestion des messages des workers
  cluster.on('message', (worker, message) => {
    if (message.type === 'log') {
      console.log(`[Worker ${worker.id}] ${message.data}`);
    }
  });

  // Graceful shutdown du master
  const shutdown = (signal) => {
    console.log(`\n🛑 ${signal} reçu - Arrêt propre du cluster...`);
    
    // Envoyer un signal à tous les workers
    for (const id in cluster.workers) {
      cluster.workers[id].send({ type: 'shutdown' });
      cluster.workers[id].disconnect();
    }
    
    // Timeout de sécurité
    setTimeout(() => {
      console.log('⏱️ Timeout - Forçage de l\'arrêt');
      process.exit(0);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Stats périodiques
  setInterval(() => {
    const workers = Object.keys(cluster.workers).length;
    const memUsage = process.memoryUsage();
    console.log(`📊 Stats: ${workers}/${numCPUs} workers actifs | RAM Master: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }, 60000); // Toutes les minutes

} else {
  // ===== PROCESSUS WORKER =====
  
  // Charger le serveur Express
  require('./server');
  
  console.log(`✅ Worker ${cluster.worker.id} (PID: ${process.pid}) prêt`);
  
  // Écouter les messages du master
  process.on('message', (message) => {
    if (message.type === 'shutdown') {
      console.log(`🛑 Worker ${cluster.worker.id} - Arrêt demandé`);
      process.exit(0);
    }
  });
}
