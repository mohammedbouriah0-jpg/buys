const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const bunnyCdn = require('./bunny-cdn');
const storageMode = require('./storage-mode');

// File d'attente pour le traitement des vidéos
const videoQueue = [];
let isProcessing = false;
const compressionEvents = new EventEmitter();

// Éviter les erreurs non gérées sur l'EventEmitter
compressionEvents.on('error', (payload) => {
  try {
    const videoId = payload && payload.videoId ? ` (videoId=${payload.videoId})` : '';
    const message = payload && payload.error && payload.error.message
      ? payload.error.message
      : String(payload);
    console.error(`❌ Erreur compressionEvents${videoId}:`, message);
  } catch (e) {
    console.error('❌ Erreur inconnue compressionEvents');
  }
});

// Configuration optimisée pour la compression
const COMPRESSION_CONFIG = {
  // Résolution maximale (format vertical 9:16)
  maxWidth: 1080,
  maxHeight: 1920,
  // Bitrate cible optimisé pour le mobile
  targetBitrate: '1200k',
  maxBitrate: '2000k',
  bufferSize: '2400k',
  // Audio optimisé
  audioBitrate: '96k',
  audioSampleRate: 44100,
  // Qualité optimisée (CRF: 23-28 pour un bon équilibre)
  crf: 25,
  // Preset plus rapide pour réduire la taille de sortie
  preset: 'faster',
  // FPS maximum
  maxFps: 30,
  // Seuil en dessous duquel on ne compresse pas (en Mo)
  minSizeForCompression: 0, // Mo (0 pour tout compresser)
  // Facteur de réduction minimum requis pour appliquer la compression
  minSizeReduction: -1, // Négatif pour toujours conserver la version compressée
};

/**
 * Vérifie si FFmpeg est installé et disponible
 */
function checkFFmpeg() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('ffmpeg -version', (error) => {
      if (error) {
        console.error('❌ FFmpeg non installé. Installez-le avec: choco install ffmpeg (Windows) ou brew install ffmpeg (Mac)');
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Compresser une vidéo avec FFmpeg - Style professionnel TikTok/YouTube
 * @param {string} inputPath - Chemin de la vidéo originale
 * @param {string} outputPath - Chemin de la vidéo compressée
 * @param {object} options - Options de compression
 * @returns {Promise<object>} - Informations sur la compression
 */
async function compressVideo(inputPath, outputPath, options = {}) {
  const config = { ...COMPRESSION_CONFIG, ...options };

  // Vérifier la taille du fichier source
  const stats = fs.statSync(inputPath);
  const fileSizeInMB = stats.size / (1024 * 1024);

  // Vérifier si le fichier est trop petit pour être compressé (moins de 10KB)
  if (fileSizeInMB < 0.01) { // 10KB
    console.log(`ℹ️  Fichier très petit (${fileSizeInMB.toFixed(2)} MB), compression ignorée`);
    return { 
      outputPath: inputPath, 
      originalSize: stats.size, 
      compressedSize: stats.size,
      skipped: true,
      message: 'Fichier trop petit pour la compression'
    };
  }

  return new Promise(async (resolve, reject) => {
    // Vérifier FFmpeg
    const ffmpegAvailable = await checkFFmpeg();
    if (!ffmpegAvailable) {
      return reject(new Error('FFmpeg non disponible'));
    }

    console.log(`\n🎬 ═══════════════════════════════════════════`);
    console.log(`🎬 COMPRESSION VIDÉO PROFESSIONNELLE`);
    console.log(`🎬 ═══════════════════════════════════════════`);
    console.log(`📁 Fichier: ${path.basename(inputPath)}`);

    const startTime = Date.now();
    
    try {
      originalSize = stats.size;
      console.log(`📊 Taille originale: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (err) {
      return reject(new Error(`Fichier introuvable: ${inputPath}`));
    }

    // Obtenir les infos de la vidéo source
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error('❌ Erreur analyse vidéo:', err.message);
        return reject(err);
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      if (!videoStream) {
        return reject(new Error('Aucun flux vidéo trouvé'));
      }

      const srcWidth = videoStream.width;
      const srcHeight = videoStream.height;
      const srcFps = eval(videoStream.r_frame_rate) || 30;
      const duration = metadata.format.duration || 0;

      console.log(`📐 Résolution source: ${srcWidth}x${srcHeight}`);
      console.log(`🎞️  FPS source: ${srcFps.toFixed(2)}`);
      console.log(`⏱️  Durée: ${duration.toFixed(2)}s`);

      // Calculer la résolution cible (garder le ratio, max 1080p)
      let targetWidth = srcWidth;
      let targetHeight = srcHeight;
      
      if (srcWidth > config.maxWidth) {
        targetWidth = config.maxWidth;
        targetHeight = Math.round(srcHeight * (config.maxWidth / srcWidth));
      }
      if (targetHeight > config.maxHeight) {
        targetHeight = config.maxHeight;
        targetWidth = Math.round(srcWidth * (config.maxHeight / srcHeight));
      }
      
      // S'assurer que les dimensions sont paires (requis par H.264)
      targetWidth = Math.floor(targetWidth / 2) * 2;
      targetHeight = Math.floor(targetHeight / 2) * 2;

      const targetFps = Math.min(srcFps, config.maxFps);

      console.log(`🎯 Résolution: ${srcWidth}x${srcHeight} (préservée)`);
      console.log(`🎯 FPS cible: ${targetFps}`);
      console.log(`⚙️  Compression en cours (ratio d'aspect préservé)...`);

      const command = ffmpeg(inputPath)
        // Codec vidéo H.264 (le plus compatible)
        .videoCodec('libx264')
        // Codec audio AAC
        .audioCodec('aac')
        // FPS
        .fps(targetFps)
        // Options de sortie optimisées
        .outputOptions([
          // Qualité constante (CRF)
          `-crf ${config.crf}`,
          // Preset de compression
          `-preset ${config.preset}`,
          // Profil H.264 (high pour meilleure compression)
          '-profile:v high',
          // Niveau H.264 (4.1 pour compatibilité mobile)
          '-level:v 4.1',
          // Format pixel compatible
          '-pix_fmt yuv420p',
          // Bitrate max pour éviter les pics
          `-maxrate ${config.maxBitrate}`,
          `-bufsize ${config.bufferSize}`,
          // Optimisation streaming (métadonnées au début)
          '-movflags +faststart',
          // Audio
          `-b:a ${config.audioBitrate}`,
          `-ar ${config.audioSampleRate}`,
          // Filtre vidéo : limiter à 1080x1920, préserver le ratio
          // puis forcer largeur/hauteur paires pour éviter "height not divisible by 2"
          `-vf scale='min(${config.maxWidth},iw)':'min(${config.maxHeight},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
          `-r ${config.maxFps}`,
          `-g ${config.maxFps * 2}`, // GOP size = 2x FPS
          `-keyint_min ${config.maxFps}`, // keyframe au moins toutes les secondes
          `-sc_threshold 0`, // désactive la détection de scène
          `-threads 0`, // utilise tous les cœurs disponibles
        ])
        .format('mp4');

      // Progression
      command.on('progress', (progress) => {
        if (progress.percent) {
          const percent = Math.min(100, Math.round(progress.percent));
          process.stdout.write(`\r⏳ Progression: ${percent}% `);
        }
      });

      // Fin
      command.on('end', () => {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        
        const originalSize = stats.size;
        let compressedSize = 0;
        let usedOriginal = false;
        
        // Vérifier si le fichier de sortie existe
        if (fs.existsSync(outputPath)) {
          compressedSize = fs.statSync(outputPath).size;
          
          // Calculer le ratio de compression
          const sizeReduction = (originalSize - compressedSize) / originalSize;
          
          // Toujours utiliser la version compressée même si plus grosse
          if (compressedSize === 0) {
            console.error('❌ Erreur: Aucune donnée compressée générée');
            fs.unlinkSync(outputPath);
            compressedSize = originalSize;
            usedOriginal = true;
          } else {
            console.log(`ℹ️  Fichier compressé: ${(sizeReduction * 100).toFixed(1)}% ${sizeReduction > 0 ? 'de réduction' : 'd\'augmentation'}`);
          }
        } else {
          console.log('⚠️  Aucun fichier de sortie généré, utilisation du fichier original');
          compressedSize = originalSize;
          usedOriginal = true;
        }
        
        const finalPath = usedOriginal ? inputPath : outputPath;
        const saved = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        const savedMB = Math.abs(originalSize - compressedSize) / (1024 * 1024);
        
        console.log('✅ TRAITEMENT TERMINÉ');
        console.log('✅ ═══════════════════════════════════════════');
        console.log(`📦 Taille originale:  ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`📦 Taille finale:    ${(compressedSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`💾 ${parseFloat(saved) >= 0 ? 'Économie' : 'Augmentation'}: ${Math.abs(parseFloat(saved))}% (${savedMB.toFixed(2)} MB ${parseFloat(saved) >= 0 ? 'économisés' : 'supplémentaires'})`);
        console.log(`⏱️  Temps: ${duration}s`);
        
        resolve({
          outputPath: finalPath,
          originalSize,
          compressedSize,
          savedPercent: parseFloat(saved),
          duration: parseFloat(duration),
          usedOriginal
        });
      });

      // Erreur
      command.on('error', (err, stdout, stderr) => {
        console.error('\n❌ Erreur FFmpeg:', err.message);
        if (stderr) console.error('Stderr:', stderr);
        reject(err);
      });

      // Lancer la compression
      command.save(outputPath);
    });
  });
}

/**
 * Générer une miniature à partir d'une vidéo
 * @param {string} videoPath - Chemin de la vidéo
 * @param {string} thumbnailPath - Chemin de la miniature
 * @param {number} timeInSeconds - Temps où capturer la miniature (en secondes)
 * @returns {Promise<string>} - Chemin de la miniature générée
 */
function generateThumbnail(videoPath, thumbnailPath, timeInSeconds = 1) {
  return new Promise((resolve, reject) => {
    console.log(`📸 Génération miniature: ${path.basename(videoPath)}`);

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '720x?',
      })
      .on('end', () => {
        console.log(`✅ Miniature générée: ${path.basename(thumbnailPath)}`);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.error('❌ Erreur génération miniature:', err.message);
        reject(err);
      });
  });
}

/**
 * Obtenir les métadonnées d'une vidéo
 * @param {string} videoPath - Chemin de la vidéo
 * @returns {Promise<object>} - Métadonnées de la vidéo
 */
function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate),
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            bitrate: audioStream.bit_rate,
            sampleRate: audioStream.sample_rate,
          } : null,
        });
      }
    });
  });
}

/**
 * Compresser une vidéo et générer une miniature automatiquement
 * @param {string} inputPath - Chemin de la vidéo originale
 * @param {string} outputDir - Dossier de sortie
 * @param {object} options - Options de compression
 * @returns {Promise<object>} - Chemins des fichiers générés
 */
async function processVideo(inputPath, outputDir, options = {}) {
  try {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const compressedPath = path.join(outputDir, `${filename}_compressed.mp4`);
    const thumbnailPath = path.join(outputDir, `${filename}_thumb.jpg`);

    // Obtenir les métadonnées
    console.log('📊 Analyse de la vidéo...');
    const metadata = await getVideoMetadata(inputPath);
    console.log(`⏱️  Durée: ${metadata.duration.toFixed(2)}s`);
    console.log(`📐 Résolution: ${metadata.video.width}x${metadata.video.height}`);

    // Compresser la vidéo
    const compressionResult = await compressVideo(inputPath, compressedPath, options);

    // Générer la miniature
    await generateThumbnail(compressedPath, thumbnailPath, 1);

    // Supprimer la vidéo originale si demandé
    if (options.deleteOriginal) {
      fs.unlinkSync(inputPath);
      console.log('🗑️  Vidéo originale supprimée');
    }

    return {
      success: true,
      video: {
        path: compressedPath,
        filename: path.basename(compressedPath),
        ...compressionResult,
      },
      thumbnail: {
        path: thumbnailPath,
        filename: path.basename(thumbnailPath),
      },
      metadata,
    };
  } catch (error) {
    console.error('❌ Erreur traitement vidéo:', error);
    throw error;
  }
}

/**
 * Ajouter une vidéo à la file d'attente de compression
 * @param {object} job - Informations sur le job
 */
function addToQueue(job) {
  videoQueue.push(job);
  console.log(`📥 Vidéo ajoutée à la file d'attente (${videoQueue.length} en attente)`);
  processQueue();
}

/**
 * Traiter la file d'attente de compression
 */
async function processQueue() {
  if (isProcessing || videoQueue.length === 0) return;
  
  isProcessing = true;
  const job = videoQueue.shift();
  
  console.log(`\n🔄 Traitement de la file d'attente (${videoQueue.length} restants)`);
  
  try {
    const { inputPath, outputPath, videoId, pool, deleteOriginal = true } = job;
    
    // Compresser la vidéo
    const result = await compressVideo(inputPath, outputPath);
    
    // Choisir le fichier final (compressé ou original suivant le résultat)
    const finalLocalPath = result && result.usedOriginal ? inputPath : outputPath;

    // Vérifier le mode de stockage (bunny ou local)
    const useBunny = await storageMode.shouldUseBunny();
    
    // Uploader sur BunnyCDN si mode bunny activé
    let finalVideoUrl;
    if (useBunny) {
      try {
        console.log(`📤 Upload vidéo compressée vers BunnyCDN depuis: ${finalLocalPath}`);

        if (!fs.existsSync(finalLocalPath)) {
          throw new Error(`Fichier local introuvable pour upload: ${finalLocalPath}`);
        }

        const uploadResult = await bunnyCdn.uploadFile(
          finalLocalPath,
          `videos/${path.basename(finalLocalPath)}`
        );
        finalVideoUrl = uploadResult.url;
        console.log(`✅ Vidéo uploadée sur BunnyCDN: ${finalVideoUrl}`);
        
        // Supprimer le fichier local (compressé ou original) après upload
        if (fs.existsSync(finalLocalPath)) {
          fs.unlinkSync(finalLocalPath);
          console.log(`🗑️ Fichier vidéo local supprimé après upload: ${path.basename(finalLocalPath)}`);
        }
      } catch (uploadError) {
        console.error(`❌ Erreur upload BunnyCDN:`, uploadError.message);
        // Fallback: garder en local
        finalVideoUrl = `/uploads/videos/${path.basename(finalLocalPath)}`;
        // Déplacer vers le dossier uploads/videos
        const destPath = path.join(path.dirname(inputPath), '..', 'videos', path.basename(finalLocalPath));
        if (fs.existsSync(finalLocalPath)) {
          fs.renameSync(finalLocalPath, destPath);
        }
      }
    } else {
      // Pas de BunnyCDN, garder en local
      finalVideoUrl = `/uploads/videos/${path.basename(finalLocalPath)}`;
      // Déplacer vers le dossier uploads/videos
      const destPath = path.join(path.dirname(inputPath), '..', 'videos', path.basename(finalLocalPath));
      if (fs.existsSync(finalLocalPath)) {
        fs.renameSync(finalLocalPath, destPath);
      }
    }
    
    // Mettre à jour la base de données avec le nouveau chemin
    if (pool && videoId) {
      await pool.query(
        'UPDATE videos SET video_url = ?, compression_status = ?, compressed_size = ?, original_size = ? WHERE id = ?',
        [finalVideoUrl, 'completed', result.compressedSize, result.originalSize, videoId]
      );
      console.log(`✅ Base de données mise à jour pour vidéo ${videoId}`);
    }
    
    // Supprimer l'original s'il reste encore (sécurité)
    if (deleteOriginal && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`🗑️ Vidéo originale supprimée (sécurité): ${path.basename(inputPath)}`);
    }
    
    compressionEvents.emit('completed', { videoId, result, url: finalVideoUrl });
    
  } catch (error) {
    console.error('❌ Erreur traitement file d\'attente:', error.message);
    
    // Mettre à jour le statut en erreur
    if (job.pool && job.videoId) {
      await job.pool.query(
        'UPDATE videos SET compression_status = ? WHERE id = ?',
        ['error', job.videoId]
      ).catch(() => {});
    }
    
    compressionEvents.emit('error', { videoId: job.videoId, error });
  }
  
  isProcessing = false;
  
  // Traiter le prochain
  if (videoQueue.length > 0) {
    setImmediate(processQueue);
  }
}

/**
 * Compresser une vidéo en arrière-plan après upload
 * @param {string} originalPath - Chemin de la vidéo uploadée
 * @param {number} videoId - ID de la vidéo dans la base
 * @param {object} pool - Pool de connexion MySQL
 */
async function compressAfterUpload(originalPath, videoId, pool) {
  const filename = path.basename(originalPath, path.extname(originalPath));
  const outputDir = path.dirname(originalPath);
  const compressedPath = path.join(outputDir, `${filename}_opt.mp4`);
  
  // Marquer comme en cours de compression
  await pool.query(
    'UPDATE videos SET compression_status = ? WHERE id = ?',
    ['processing', videoId]
  );
  
  // Ajouter à la file d'attente
  addToQueue({
    inputPath: originalPath,
    outputPath: compressedPath,
    videoId,
    pool,
    deleteOriginal: true
  });
}

/**
 * Obtenir le statut de la file d'attente
 */
function getQueueStatus() {
  return {
    queueLength: videoQueue.length,
    isProcessing,
    jobs: videoQueue.map(j => ({ videoId: j.videoId }))
  };
}

module.exports = {
  compressVideo,
  generateThumbnail,
  getVideoMetadata,
  processVideo,
  compressAfterUpload,
  addToQueue,
  getQueueStatus,
  checkFFmpeg,
  compressionEvents,
  COMPRESSION_CONFIG,
};
