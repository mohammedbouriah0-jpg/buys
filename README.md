# Buys - Marketplace avec vidéos sociales

Application mobile marketplace avec fonctionnalités de vidéos sociales (style TikTok).

## Stack Technique

- **Frontend**: React Native + Expo
- **Backend**: Node.js + Express
- **Base de données**: MySQL
- **Notifications**: Firebase Cloud Messaging

## Installation

### Prérequis

- Node.js 18+
- MySQL 8+
- Android Studio (pour Android)
- Xcode (pour iOS)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurer les variables dans .env
npm start
```

### Frontend

```bash
npm install
npx expo start
```

## Configuration

### Android Release Build

1. Créer `android/gradle.local.properties` avec vos credentials :
```properties
MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_password
MYAPP_UPLOAD_KEY_PASSWORD=your_password
```

2. Build :
```bash
cd android
./gradlew bundleRelease
```

### Variables d'environnement

Voir `backend/.env.example` pour la liste complète.

## Fonctionnalités

- Marketplace de produits
- Vidéos sociales (feed vertical)
- Gestion de boutiques
- Système de commandes
- Notifications push
- Codes promo
- Deep linking


## Liens

- Privacy Policy: https://buysdz.com/privacy-policy.html
- Child Safety: https://buysdz.com/child-safety.html
