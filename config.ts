// Configuration de l'application
// ⚠️ IMPORTANT: Changez cette IP quand vous changez de réseau
export const API_CONFIG = {
  // Remplacez par votre IP locale (trouvez-la avec ipconfig sur Windows ou ifconfig sur Mac/Linux)
  SERVER_IP: "31.97.68.10",
  PORT: "3000",
};

// URL de l'API construite automatiquement
export const API_URL = `http://${API_CONFIG.SERVER_IP}:${API_CONFIG.PORT}/api`;

// Pour trouver votre IP:
// Windows: Ouvrez CMD et tapez "ipconfig" - cherchez "Adresse IPv4"
// Mac/Linux: Ouvrez Terminal et tapez "ifconfig" - cherchez "inet"
