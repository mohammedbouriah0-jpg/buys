# 🛠️ Commandes utiles - buys Expo

## 📱 Développement

### Démarrer l'application
```bash
npm start
```
Ouvre Expo DevTools et affiche le QR code

### Démarrer avec cache nettoyé
```bash
npm run reset
# ou
npx expo start -c
```
Utile si vous rencontrez des problèmes

### Lancer sur Android
```bash
npm run android
```
Nécessite Android Studio et un émulateur

### Lancer sur iOS
```bash
npm run ios
```
Nécessite macOS et Xcode

### Lancer sur Web
```bash
npm run web
```
Ouvre l'app dans le navigateur

## 🔧 Maintenance

### Installer les dépendances
```bash
npm install
```

### Mettre à jour les dépendances
```bash
npx expo install --fix
```
Met à jour les packages vers les versions compatibles

### Nettoyer complètement
```bash
rm -rf node_modules
rm -rf .expo
npm install
```

### Vérifier les problèmes
```bash
npx expo-doctor
```
Diagnostique les problèmes de configuration

## 📦 Build

### Build Android (APK)
```bash
npx eas build --platform android --profile preview
```

### Build iOS
```bash
npx eas build --platform ios --profile preview
```

### Build pour les deux plateformes
```bash
npx eas build --platform all
```

## 🚀 Publication

### Publier une mise à jour OTA
```bash
npx eas update
```
Met à jour l'app sans rebuild

### Soumettre à Google Play
```bash
npx eas submit --platform android
```

### Soumettre à App Store
```bash
npx eas submit --platform ios
```

## 🐛 Débogage

### Ouvrir React DevTools
```bash
# Dans le terminal où tourne expo start
# Appuyez sur 'j'
```

### Ouvrir le menu développeur
- **iOS** : Cmd + D (simulateur) ou secouez l'appareil
- **Android** : Cmd + M (émulateur) ou secouez l'appareil

### Recharger l'application
- **Raccourci** : Appuyez sur 'r' dans le terminal
- **Menu dev** : Secouez l'appareil → Reload

### Voir les logs
```bash
# Les logs s'affichent automatiquement dans le terminal
# Pour filtrer :
npx react-native log-android  # Android
npx react-native log-ios       # iOS
```

## 🔍 Inspection

### Inspecter les éléments (Web)
```bash
npm run web
# Puis F12 dans le navigateur
```

### Inspecter sur Android
```bash
# Chrome DevTools
chrome://inspect
```

### Inspecter sur iOS
```bash
# Safari Web Inspector
Safari → Develop → Simulator → localhost
```

## 📊 Performance

### Analyser le bundle
```bash
npx expo export --dump-sourcemap
```

### Profiler les performances
```bash
# Ouvrir React DevTools Profiler
# Menu dev → Toggle Performance Monitor
```

## 🧪 Tests

### Lancer les tests (si configurés)
```bash
npm test
```

### Tests E2E avec Detox (si configurés)
```bash
npm run test:e2e
```

## 🔐 Configuration

### Configurer EAS
```bash
npx eas init
```

### Configurer les credentials
```bash
npx eas credentials
```

### Voir la configuration
```bash
npx eas config
```

## 📱 Gestion des appareils

### Lister les appareils iOS
```bash
xcrun simctl list devices
```

### Lister les émulateurs Android
```bash
emulator -list-avds
```

### Démarrer un émulateur Android
```bash
emulator -avd Pixel_5_API_31
```

## 🔄 Mise à jour Expo

### Mettre à jour Expo SDK
```bash
npx expo upgrade
```

### Mettre à jour vers une version spécifique
```bash
npx expo upgrade 52.0.0
```

## 📝 Génération

### Générer les icônes
```bash
npx expo prebuild
```

### Générer le splash screen
```bash
npx expo prebuild --clean
```

## 🌐 Environnement

### Variables d'environnement
```bash
# Créer un fichier .env
echo "API_URL=https://api.example.com" > .env
```

### Utiliser les variables
```typescript
import Constants from 'expo-constants'
const apiUrl = Constants.expoConfig?.extra?.apiUrl
```

## 🔧 Outils utiles

### Ouvrir le dossier du projet
```bash
open .  # macOS
explorer .  # Windows
```

### Voir la version d'Expo
```bash
npx expo --version
```

### Voir les infos du projet
```bash
npx expo config
```

## 💡 Raccourcis dans le terminal

Quand `expo start` est lancé :

- `r` - Recharger l'app
- `m` - Ouvrir le menu
- `j` - Ouvrir React DevTools
- `c` - Nettoyer le cache
- `d` - Ouvrir Expo DevTools
- `?` - Afficher l'aide

## 🚨 Dépannage rapide

### Problème de cache
```bash
npx expo start -c
```

### Problème de dépendances
```bash
rm -rf node_modules
npm install
```

### Problème de Metro
```bash
npx expo start --clear
```

### Problème de build
```bash
npx expo prebuild --clean
```

### Réinitialiser complètement
```bash
rm -rf node_modules .expo ios android
npm install
npx expo prebuild
```

## 📚 Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Expo CLI Reference](https://docs.expo.dev/workflow/expo-cli/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)

## 💬 Support

- [Forum Expo](https://forums.expo.dev/)
- [Discord Expo](https://chat.expo.dev/)
- [GitHub Issues](https://github.com/expo/expo/issues)

---

**Astuce** : Ajoutez ces commandes à votre `package.json` pour un accès rapide !
