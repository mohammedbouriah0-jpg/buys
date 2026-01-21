const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { auth, isShop, requireActiveSubscription } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { buildFullUrl } = require("../utils/url-helper");
const { compressAfterUpload, checkFFmpeg, getQueueStatus } = require("../services/video-compression");
const bunnyCdn = require("../services/bunny-cdn");
const storageMode = require("../services/storage-mode");
const fs = require("fs");

// Middleware optionnel pour l'auth
const optionalAuth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore les erreurs, l'auth est optionnelle
  }
  next();
};

// Get all videos
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { shop_id, subscriptions } = req.query;
    const subscriptionsOnly = subscriptions === "true";

    let query = `
      SELECT v.*, s.shop_name, s.verified, s.logo_url as shop_logo,
      (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comments_count,
      (SELECT COUNT(*) FROM subscriptions WHERE shop_id = v.shop_id) as subscribers_count,
      p.id as product_id, p.name as product_name, p.price as product_price, 
      COALESCE(
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
        p.image_url
      ) as product_image,
      p.stock as product_stock
      FROM videos v
      LEFT JOIN shops s ON v.shop_id = s.id
      LEFT JOIN products p ON v.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (shop_id) {
      query += " AND v.shop_id = ?";
      params.push(shop_id);
    }

    // Filter by subscriptions if requested
    if (subscriptionsOnly && req.user) {
      query +=
        " AND v.shop_id IN (SELECT shop_id FROM subscriptions WHERE user_id = ?)";
      params.push(req.user.id);
    }

    query += " ORDER BY v.created_at DESC";

    const [videos] = await pool.query(query, params);

    if (videos.length === 0) {
      return res.json([]);
    }

    // OPTIMIZED: Get all likes and subscriptions in 2 queries instead of 2*N
    let likedVideoIds = new Set();
    let subscribedShopIds = new Set();
    
    if (req.user) {
      const videoIds = videos.map(v => v.id);
      const shopIds = [...new Set(videos.map(v => v.shop_id).filter(Boolean))];
      
      // Get all liked videos in ONE query
      if (videoIds.length > 0) {
        const [userLikes] = await pool.query(
          "SELECT video_id FROM video_likes WHERE video_id IN (?) AND user_id = ?",
          [videoIds, req.user.id]
        );
        likedVideoIds = new Set(userLikes.map(l => l.video_id));
      }
      
      // Get all subscriptions in ONE query
      if (shopIds.length > 0) {
        const [userSubs] = await pool.query(
          "SELECT shop_id FROM subscriptions WHERE shop_id IN (?) AND user_id = ?",
          [shopIds, req.user.id]
        );
        subscribedShopIds = new Set(userSubs.map(s => s.shop_id));
      }
    }

    // Process all videos in a single loop
    for (let video of videos) {
      video.liked = likedVideoIds.has(video.id);
      video.subscribed = subscribedShopIds.has(video.shop_id);

      // Construire les URLs complètes dynamiquement
      video.video_url = buildFullUrl(video.video_url, req);
      video.thumbnail_url = buildFullUrl(video.thumbnail_url, req);
      video.shop_logo = buildFullUrl(video.shop_logo, req);

      // Construire l'objet product si présent
      if (video.product_id) {
        video.product = {
          id: video.product_id,
          name: video.product_name,
          price: video.product_price,
          image: buildFullUrl(video.product_image, req),
          stock: video.product_stock,
        };
      }
      // Nettoyer les champs temporaires
      delete video.product_id;
      delete video.product_name;
      delete video.product_price;
      delete video.product_image;
      delete video.product_stock;
    }

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get my videos (shop's videos - requires active subscription)
router.get("/my-videos", auth, requireActiveSubscription, async (req, res) => {
  try {
    const [shops] = await pool.query('SELECT id FROM shops WHERE user_id = ?', [req.user.id]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: 'Boutique non trouvée' });
    }

    const shopId = shops[0].id;

    const [videos] = await pool.query(`
      SELECT v.*,
      (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comments_count
      FROM videos v
      WHERE v.shop_id = ?
      ORDER BY v.created_at DESC
    `, [shopId]);

    // Construire les URLs complètes pour toutes les qualités
    for (let video of videos) {
      video.video_url = buildFullUrl(video.video_url, req);
      video.video_url_high = buildFullUrl(video.video_url_high, req);
      video.video_url_medium = buildFullUrl(video.video_url_medium, req);
      video.video_url_low = buildFullUrl(video.video_url_low, req);
      video.thumbnail_url = buildFullUrl(video.thumbnail_url, req);
    }

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get video by ID
router.get("/:id", async (req, res) => {
  try {
    const [videos] = await pool.query(
      `
      SELECT v.*, s.shop_name, s.verified, s.logo_url as shop_logo,
      (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE video_id = v.id) as comments_count
      FROM videos v
      LEFT JOIN shops s ON v.shop_id = s.id
      WHERE v.id = ?
    `,
      [req.params.id]
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    const video = videos[0];

    // Increment views
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [
      req.params.id,
    ]);

    // Get product if linked
    if (video.product_id) {
      const [products] = await pool.query(
        "SELECT * FROM products WHERE id = ?",
        [video.product_id]
      );
      video.product = products[0];
    }

    // Construire les URLs complètes dynamiquement
    video.video_url = buildFullUrl(video.video_url, req);
    video.thumbnail_url = buildFullUrl(video.thumbnail_url, req);
    video.shop_logo = buildFullUrl(video.shop_logo, req);

    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Create video (shop only - requires active subscription)
router.post(
  "/",
  auth,
  requireActiveSubscription,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Vérifier si la boutique est vérifiée
      const [userCheck] = await pool.query(
        "SELECT is_verified FROM users WHERE id = ?",
        [req.user.id]
      );
      
      if (userCheck.length === 0 || !userCheck[0].is_verified) {
        return res.status(403).json({ 
          error: "Boutique non vérifiée",
          message: "Votre boutique doit être vérifiée pour poster des vidéos",
          verification_required: true
        });
      }

      const { title, description, product_id } = req.body;

      if (!req.files.video) {
        return res.status(400).json({ error: "Vidéo requise" });
      }

      const [shops] = await pool.query(
        "SELECT id FROM shops WHERE user_id = ?",
        [req.user.id]
      );
      if (shops.length === 0) {
        return res.status(404).json({ error: "Boutique non trouvée" });
      }

      const shopId = shops[0].id;
      
      // Utiliser la vidéo uploadée (déjà compressée côté client)
      const videoFile = req.files.video[0];
      const path = require('path');
      const videoPath = path.join(__dirname, '..', videoFile.path);
      
      console.log(`📹 Vidéo uploadée: ${videoFile.filename} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`);

      // Vérifier le mode de stockage (bunny ou local)
      const useBunny = await storageMode.shouldUseBunny();
      
      // Upload thumbnail sur BunnyCDN si mode bunny activé
      let thumbnailUrl = null;
      if (req.files.thumbnail) {
        try {
          if (useBunny) {
            thumbnailUrl = await bunnyCdn.uploadMulterFile(req.files.thumbnail[0], 'thumbnails');
            console.log(`✅ Thumbnail uploadée sur BunnyCDN: ${thumbnailUrl}`);
          } else {
            // Mode local: garder en local
            thumbnailUrl = `/uploads/images/${req.files.thumbnail[0].filename}`;
            console.log(`📁 Mode local: thumbnail stockée localement: ${thumbnailUrl}`);
          }
        } catch (uploadError) {
          console.error(`❌ Erreur upload thumbnail:`, uploadError.message);
          thumbnailUrl = `/uploads/images/${req.files.thumbnail[0].filename}`;
        }
      }

      // Insérer la vidéo avec une URL temporaire (sera mise à jour après compression)
      const tempVideoUrl = `/uploads/temp/videos/${videoFile.filename}`;
      const [result] = await pool.query(
        "INSERT INTO videos (shop_id, title, description, video_url, thumbnail_url, product_id, compression_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [shopId, title, description, tempVideoUrl, thumbnailUrl, product_id || null, 'pending']
      );

      const videoId = result.insertId;

      // Compression automatique et upload vers BunnyCDN en arrière-plan
      const ffmpegAvailable = await checkFFmpeg();
      
      if (ffmpegAvailable) {
        // Lancer la compression en arrière-plan
        console.log(`🎬 Lancement compression pour vidéo ${videoId}...`);
        compressAfterUpload(videoPath, videoId, pool).catch(err => {
          console.error(`❌ Erreur compression vidéo ${videoId}:`, err.message);
        });
        
        res.status(201).json({ 
          id: videoId, 
          message: "Vidéo créée avec succès. Compression et upload en cours...",
          compression: "processing"
        });
      } else {
        // FFmpeg non disponible, uploader directement selon le mode de stockage
        console.log(`⚠️ FFmpeg non disponible - upload direct (mode: ${useBunny ? 'bunny' : 'local'})`);
        
        try {
          if (useBunny) {
            const videoUrl = await bunnyCdn.uploadMulterFile(videoFile, 'videos');
            await pool.query(
              "UPDATE videos SET video_url = ?, compression_status = ? WHERE id = ?",
              [videoUrl, 'skipped', videoId]
            );
            console.log(`✅ Vidéo uploadée directement sur BunnyCDN: ${videoUrl}`);

            // Supprimer le fichier local temporaire si présent
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
              console.log(`🗑️ Fichier vidéo local (temp) supprimé: ${videoFile.filename}`);
            }
          } else {
            // Mode local: déplacer vers le dossier uploads/videos
            const destPath = path.join(__dirname, '..', 'uploads', 'videos', videoFile.filename);
            fs.renameSync(videoPath, destPath);
            await pool.query(
              "UPDATE videos SET video_url = ?, compression_status = ? WHERE id = ?",
              [`/uploads/videos/${videoFile.filename}`, 'skipped', videoId]
            );
            console.log(`📁 Mode local: vidéo stockée localement: /uploads/videos/${videoFile.filename}`);
          }
        } catch (uploadError) {
          console.error(`❌ Erreur upload vidéo:`, uploadError.message);
        }
        
        res.status(201).json({ 
          id: videoId, 
          message: "Vidéo créée avec succès",
          compression: "skipped"
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// Get compression status for a video
router.get("/:id/compression-status", auth, async (req, res) => {
  try {
    const [videos] = await pool.query(
      "SELECT compression_status, original_size, compressed_size FROM videos WHERE id = ?",
      [req.params.id]
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    const video = videos[0];
    const savings = video.original_size && video.compressed_size 
      ? ((1 - video.compressed_size / video.original_size) * 100).toFixed(1)
      : null;

    res.json({
      status: video.compression_status || 'pending',
      originalSize: video.original_size,
      compressedSize: video.compressed_size,
      savingsPercent: savings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get compression queue status (admin/debug)
router.get("/admin/compression-queue", auth, async (req, res) => {
  try {
    const queueStatus = getQueueStatus();
    res.json(queueStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Update video (requires active subscription)
router.put("/:id", auth, requireActiveSubscription, async (req, res) => {
  try {
    const { title, description, product_id } = req.body;
    
    const [shops] = await pool.query("SELECT id FROM shops WHERE user_id = ?", [
      req.user.id,
    ]);
    
    if (shops.length === 0) {
      return res.status(404).json({ error: "Boutique non trouvée" });
    }
    
    const shopId = shops[0].id;

    // Si product_id est fourni, vérifier qu'il appartient à la boutique
    if (product_id !== undefined && product_id !== null) {
      const [products] = await pool.query(
        "SELECT id FROM products WHERE id = ? AND shop_id = ?",
        [product_id, shopId]
      );
      
      if (products.length === 0) {
        return res.status(400).json({ error: "Produit non trouvé ou n'appartient pas à votre boutique" });
      }
    }

    const [result] = await pool.query(
      "UPDATE videos SET title = ?, description = ?, product_id = ? WHERE id = ? AND shop_id = ?",
      [title, description, product_id || null, req.params.id, shopId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    console.log(`✅ [VIDEO UPDATE] Vidéo ${req.params.id} modifiée, produit: ${product_id || 'aucun'}`);
    res.json({ message: "Vidéo modifiée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Delete video (requires active subscription)
router.delete("/:id", auth, requireActiveSubscription, async (req, res) => {
  try {
    const [shops] = await pool.query("SELECT id FROM shops WHERE user_id = ?", [
      req.user.id,
    ]);
    const shopId = shops[0].id;

    // Récupérer les infos de la vidéo avant suppression
    const [videos] = await pool.query(
      "SELECT video_url, video_url_high, video_url_medium, video_url_low, thumbnail_url FROM videos WHERE id = ? AND shop_id = ?",
      [req.params.id, shopId]
    );

    if (videos.length === 0) {
      return res.status(404).json({ error: "Vidéo non trouvée" });
    }

    const video = videos[0];
    const path = require('path');

    // Supprimer les fichiers vidéo et thumbnail (BunnyCDN ou local)
    const filesToDelete = [
      video.video_url,
      video.video_url_high,
      video.video_url_medium,
      video.video_url_low,
      video.thumbnail_url
    ].filter(Boolean);

    for (const fileUrl of filesToDelete) {
      try {
        if (!fileUrl) continue;
        
        if (bunnyCdn.isBunnyCdnUrl(fileUrl)) {
          // Extraire le chemin relatif pour BunnyCDN
          const remotePath = bunnyCdn.extractPathFromCdnUrl(fileUrl);
          if (remotePath) {
            await bunnyCdn.deleteFile(remotePath);
            console.log(`🗑️ Fichier BunnyCDN supprimé: ${remotePath}`);
          } else {
            console.error(`❌ Impossible d'extraire le chemin BunnyCDN de: ${fileUrl}`);
          }
        } else if (fileUrl.startsWith('/')) {
          // Supprimer du serveur local (uniquement les chemins absolus)
          const filePath = path.join(__dirname, '..', fileUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Fichier local supprimé: ${filePath}`);
            
            // Essayer de supprimer le dossier parent s'il est vide
            try {
              const dir = path.dirname(filePath);
              if (fs.readdirSync(dir).length === 0) {
                fs.rmdirSync(dir);
                console.log(`🗑️ Dossier vide supprimé: ${dir}`);
              }
            } catch (e) {
              // Ignorer les erreurs de suppression de dossier
            }
          }
        }
      } catch (err) {
        console.error(`⚠️ Erreur suppression fichier ${fileUrl}:`, err.message);
      }
    }

    // Supprimer les likes et commentaires associés
    await pool.query("DELETE FROM video_likes WHERE video_id = ?", [req.params.id]);
    await pool.query("DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE video_id = ?)", [req.params.id]);
    await pool.query("DELETE FROM comments WHERE video_id = ?", [req.params.id]);

    // Supprimer la vidéo de la base de données
    const [result] = await pool.query(
      "DELETE FROM videos WHERE id = ? AND shop_id = ?",
      [req.params.id, shopId]
    );

    console.log(`✅ Vidéo ${req.params.id} supprimée avec tous ses fichiers`);
    res.json({ message: "Vidéo supprimée" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Increment view
router.post("/:id/view", optionalAuth, async (req, res) => {
  try {
    await pool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Like/Unlike video
router.post("/:id/like", auth, async (req, res) => {
  try {
    const [existing] = await pool.query(
      "SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.query(
        "DELETE FROM video_likes WHERE video_id = ? AND user_id = ?",
        [req.params.id, req.user.id]
      );
      res.json({ liked: false });
    } else {
      // Like
      await pool.query(
        "INSERT INTO video_likes (video_id, user_id) VALUES (?, ?)",
        [req.params.id, req.user.id]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Get comments
router.get("/:id/comments", optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count of root comments
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE video_id = ? AND parent_id IS NULL',
      [req.params.id]
    );
    const totalComments = countResult[0].total;

    // Get root comments with pagination
    const [rootCommentsIds] = await pool.query(
      `SELECT id FROM comments WHERE video_id = ? AND parent_id IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.params.id, limit, offset]
    );

    if (rootCommentsIds.length === 0) {
      return res.json({ comments: [], total: totalComments, hasMore: false });
    }

    const rootIds = rootCommentsIds.map(r => r.id);

    // Get all comments (selected roots and their replies)
    const [allComments] = await pool.query(
      `
      SELECT c.*, 
        u.name as user_name, 
        u.avatar_url as user_avatar,
        u.type as user_type,
        s.shop_name,
        s.logo_url as shop_logo,
        s.verified as shop_verified,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as replies_count
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN shops s ON u.id = s.user_id AND u.type = 'shop'
      WHERE c.video_id = ? AND (c.id IN (?) OR c.parent_id IN (?))
      ORDER BY c.created_at ASC
    `,
      [req.params.id, rootIds, rootIds]
    );

    // OPTIMIZED: Get all user likes in ONE query instead of N
    let likedCommentIds = new Set();
    if (req.user && allComments.length > 0) {
      const commentIds = allComments.map(c => c.id);
      const [userLikes] = await pool.query(
        "SELECT comment_id FROM comment_likes WHERE comment_id IN (?) AND user_id = ?",
        [commentIds, req.user.id]
      );
      likedCommentIds = new Set(userLikes.map(l => l.comment_id));
    }

    // Process all comments
    allComments.forEach((comment) => {
      comment.liked = likedCommentIds.has(comment.id);
      if (comment.user_avatar) {
        comment.user_avatar = buildFullUrl(comment.user_avatar, req);
      }
      if (comment.shop_logo) {
        comment.shop_logo = buildFullUrl(comment.shop_logo, req);
      }
    });

    // Organize comments into parent-child structure
    const commentsMap = {};
    const rootComments = [];

    // First pass: create map
    allComments.forEach((comment) => {
      comment.replies = [];
      commentsMap[comment.id] = comment;
    });

    // Second pass: organize hierarchy
    allComments.forEach((comment) => {
      if (comment.parent_id) {
        if (commentsMap[comment.parent_id]) {
          commentsMap[comment.parent_id].replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    // Sort root comments by date (newest first)
    rootComments.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const hasMore = offset + rootComments.length < totalComments;
    res.json({ comments: rootComments, total: totalComments, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Like/Unlike comment
router.post("/comments/:commentId/like", auth, async (req, res) => {
  try {
    const { commentId } = req.params;

    // Check if already liked
    const [existing] = await pool.query(
      "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
      [commentId, req.user.id]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.query(
        "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [commentId, req.user.id]
      );

      const [result] = await pool.query(
        "SELECT COUNT(*) as likes_count FROM comment_likes WHERE comment_id = ?",
        [commentId]
      );

      res.json({ liked: false, likes_count: result[0].likes_count });
    } else {
      // Like
      await pool.query(
        "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
        [commentId, req.user.id]
      );

      const [result] = await pool.query(
        "SELECT COUNT(*) as likes_count FROM comment_likes WHERE comment_id = ?",
        [commentId]
      );

      res.json({ liked: true, likes_count: result[0].likes_count });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Add comment
router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { content, parent_id } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Commentaire vide" });
    }

    const [result] = await pool.query(
      "INSERT INTO comments (video_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)",
      [req.params.id, req.user.id, content, parent_id || null]
    );

    const [comments] = await pool.query(
      `
      SELECT c.*, u.name as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `,
      [result.insertId]
    );

    res.status(201).json(comments[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
