// Configuration de l'application
// ⚠️ IMPORTANT: Changez cette IP/nom de domaine quand vous changez d'environnement
export const API_CONFIG = {
  // Domaine de production (avec certificat SSL)
  SERVER_IP: "buysdz.com",
  // Mettre true car le serveur a maintenant un certificat SSL
  USE_HTTPS: true,
};

// URL de l'API construite automatiquement
const protocol = API_CONFIG.USE_HTTPS ? "https" : "http";
export const API_URL = `${protocol}://${API_CONFIG.SERVER_IP}/api`;

// Pour trouver votre IP:
// Windows: Ouvrez CMD et tapez "ipconfig" - cherchez "Adresse IPv4"
// Mac/Linux: Ouvrez Terminal et tapez "ifconfig" - cherchez "inet"
