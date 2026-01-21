const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Dossiers de stockage temporaire (avant upload vers BunnyCDN)
const TEMP_DIRS = {
  videos: 'uploads/temp/videos',
  images: 'uploads/temp/images',
};

// Dossiers de stockage local (fallback si BunnyCDN non configuré)
const LOCAL_DIRS = {
  videos: 'uploads/videos',
  images: 'uploads/images',
};

// Créer tous les dossiers nécessaires s'ils n'existent pas
[...Object.values(TEMP_DIRS), ...Object.values(LOCAL_DIRS)].forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Dossier créé: ${dir}`);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'video' ? TEMP_DIRS.videos : TEMP_DIRS.images;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers vidéo sont acceptés'), false);
    }
  } else {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont acceptés'), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB - pas de limite pratique, la compression gère après
  }
});

// Export les dossiers pour utilisation dans d'autres modules
upload.TEMP_DIRS = TEMP_DIRS;
upload.LOCAL_DIRS = LOCAL_DIRS;

module.exports = upload;
