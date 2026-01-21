const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

// Configuration des qualités (optimisées pour compression maximale)
const QUALITY_PRESETS = {
  high: {
    name: 'high',
    width: 1080,
    height: 1920,
    videoBitrate: '2000k',  // Réduit de 2500k
    audioBitrate: '96k',    // Réduit de 128k
    suffix: '_high',
    crf: 23  // Constant Rate Factor (18-28, plus élevé = plus compressé)
  },
  medium: {
    name: 'medium',
    width: 720,
    height: 1280,
    videoBitrate: '1200k',  // Réduit de 1500k
    audioBitrate: '80k',    // Réduit de 96k
    suffix: '_medium',
    crf: 24
  },
  low: {
    name: 'low',
    width: 480,
    height: 854,
    videoBitrate: '600k',   // Réduit de 800k
    audioBitrate: '64k',
    suffix: '_low',
    crf: 26
  }
};

/**
 * Transcode une vidéo en plusieurs qualités
 * @param {string} inputPath - Chemin de la vidéo source
 * @param {string} outputDir - Dossier de sortie
 * @param {string} baseFilename - Nom de base du fichier (sans extension)
 * @param {boolean} deleteOriginal - Supprimer la vidéo originale après transcodage
 * @returns {Promise<Object>} - URLs des vidéos transcodées
 */
async function transcodeVideo(inputPath, outputDir, baseFilename, deleteOriginal = true) {
  console.log('🎬 Début du transcodage:', baseFilename);
  
  const results = {
    high: null,
    medium: null,
    low: null,
    original: inputPath
  };

  try {
    // Créer le dossier de sortie s'il n'existe pas
    await fs.mkdir(outputDir, { recursive: true });

    // Obtenir la taille originale
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;
    console.log(`📊 Taille originale: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    let totalCompressedSize = 0;

    // Transcoder chaque qualité
    for (const [quality, preset] of Object.entries(QUALITY_PRESETS)) {
      const outputFilename = `${baseFilename}${preset.suffix}.mp4`;
      const outputPath = path.join(outputDir, outputFilename);

      console.log(`📹 Transcodage ${quality}...`);
      
      await transcodeToQuality(inputPath, outputPath, preset);
      
      // Calculer la taille compressée
      const compressedStats = await fs.stat(outputPath);
      const compressedSize = compressedStats.size;
      totalCompressedSize += compressedSize;
      
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(`✅ ${quality} terminé: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${reduction}% de réduction)`);
      
      results[quality] = `/uploads/videos/${outputFilename}`;
    }

    // Supprimer la vidéo originale si demandé
    if (deleteOriginal) {
      try {
        await fs.unlink(inputPath);
        console.log('🗑️ Vidéo originale supprimée');
      } catch (error) {
        console.warn('⚠️ Impossible de supprimer la vidéo originale:', error.message);
      }
    }

    const totalReduction = ((1 - totalCompressedSize / originalSize) * 100).toFixed(1);
    console.log(`💾 Économie totale: ${totalReduction}% (${((originalSize - totalCompressedSize) / 1024 / 1024).toFixed(2)} MB économisés)`);
    console.log('🎉 Transcodage complet!');
    
    return results;

  } catch (error) {
    console.error('❌ Erreur transcodage:', error);
    throw error;
  }
}

/**
 * Transcode une vidéo vers une qualité spécifique
 */
function transcodeToQuality(inputPath, outputPath, preset) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .size(`${preset.width}x${preset.height}`)
      .videoBitrate(preset.videoBitrate)
      .audioBitrate(preset.audioBitrate)
      .videoCodec('libx264')
      .audioCodec('aac')
      .format('mp4')
      .outputOptions([
        '-preset medium',           // Meilleur équilibre compression/vitesse
        '-crf ' + preset.crf,       // Qualité constante (compression optimale)
        '-movflags +faststart',     // Optimisation pour streaming
        '-profile:v main',          // Profile main (meilleure compression que baseline)
        '-level 4.0',               // Level 4.0 (support plus large)
        '-pix_fmt yuv420p',         // Format de pixel compatible
        '-tune film',               // Optimisé pour vidéos réelles
        '-x264-params keyint=60:min-keyint=30', // Keyframes optimisés
        '-movflags use_metadata_tags' // Préserver les métadonnées
      ])
      .on('start', (commandLine) => {
        console.log('🔧 FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⏳ Progression ${preset.name}: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Transcodage ${preset.name} terminé`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Erreur transcodage ${preset.name}:`, err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Obtenir les informations d'une vidéo
 */
function getVideoInfo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          duration: metadata.format.duration,
          width: videoStream?.width,
          height: videoStream?.height,
          bitrate: metadata.format.bit_rate,
          size: metadata.format.size
        });
      }
    });
  });
}

/**
 * Générer une miniature depuis une vidéo
 */
function generateThumbnail(videoPath, outputPath, timeInSeconds = 1) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '720x1280'
      })
      .on('end', () => {
        console.log('✅ Miniature générée');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Erreur génération miniature:', err);
        reject(err);
      });
  });
}

/**
 * Nettoyer les fichiers temporaires
 */
async function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log(`🗑️ Fichier temporaire supprimé: ${file}`);
    } catch (error) {
      console.error(`⚠️ Impossible de supprimer ${file}:`, error.message);
    }
  }
}

/**
 * Vérifier si FFmpeg est installé
 */
function checkFFmpegInstalled() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('❌ FFmpeg non trouvé:', err.message);
        resolve(false);
      } else {
        console.log('✅ FFmpeg disponible');
        resolve(true);
      }
    });
  });
}

/**
 * Transcoder les vidéos existantes (migration)
 */
async function transcodeExistingVideos(pool) {
  console.log('🔄 Début du transcodage des vidéos existantes...');
  
  try {
    // Récupérer toutes les vidéos sans qualités multiples
    const [videos] = await pool.query(`
      SELECT id, video_url 
      FROM videos 
      WHERE video_url_high IS NULL 
        AND video_url IS NOT NULL
    `);

    console.log(`📊 ${videos.length} vidéos à transcoder`);

    for (const video of videos) {
      try {
        const videoPath = path.join(__dirname, '..', video.video_url);
        
        // Vérifier si le fichier existe
        try {
          await fs.access(videoPath);
        } catch {
          console.log(`⚠️ Vidéo ${video.id} introuvable: ${videoPath}`);
          continue;
        }

        const baseFilename = path.basename(video.video_url, path.extname(video.video_url));
        const outputDir = path.join(__dirname, '..', 'uploads', 'videos');

        console.log(`\n🎬 Transcodage vidéo ${video.id}...`);
        const results = await transcodeVideo(videoPath, outputDir, baseFilename);

        // Mettre à jour la base de données
        await pool.query(`
          UPDATE videos 
          SET video_url_high = ?,
              video_url_medium = ?,
              video_url_low = ?
          WHERE id = ?
        `, [results.high, results.medium, results.low, video.id]);

        console.log(`✅ Vidéo ${video.id} transcodée et mise à jour`);

      } catch (error) {
        console.error(`❌ Erreur vidéo ${video.id}:`, error.message);
      }
    }

    console.log('\n🎉 Transcodage des vidéos existantes terminé!');

  } catch (error) {
    console.error('❌ Erreur transcodage batch:', error);
    throw error;
  }
}

module.exports = {
  transcodeVideo,
  transcodeToQuality,
  getVideoInfo,
  generateThumbnail,
  cleanupTempFiles,
  checkFFmpegInstalled,
  transcodeExistingVideos,
  QUALITY_PRESETS
};
