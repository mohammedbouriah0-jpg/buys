# 📱 Guide d'installation - buys Expo App

## Prérequis

- Node.js 18+ installé
- npm ou pnpm
- Expo Go app sur votre téléphone (iOS/Android)
- OU Android Studio / Xcode pour émulateurs

## Installation étape par étape

### 1. Installer les dépendances

```bash
cd expo-app
npm install
```

Ou avec pnpm :
```bash
cd expo-app
pnpm install
```

### 2. Démarrer le serveur de développement

```bash
npm start
```

Cela ouvrira Expo DevTools dans votre navigateur.

### 3. Tester l'application

#### Option A : Sur votre téléphone (recommandé)

1. Installez **Expo Go** depuis :
   - [App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scannez le QR code affiché dans le terminal ou Expo DevTools :
   - **iOS** : Utilisez l'app Appareil Photo native
   - **Android** : Utilisez l'app Expo Go directement

#### Option B : Sur émulateur

**Android :**
```bash
npm run android
```
(Nécessite Android Studio et un émulateur configuré)

**iOS :**
```bash
npm run ios
```
(Nécessite macOS et Xcode)

#### Option C : Sur navigateur web

```bash
npm run web
```

## 🔧 Dépannage

### Erreur "Metro bundler"
```bash
# Nettoyer le cache
npx expo start -c
```

### Erreur de dépendances
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules
npm install
```

### Problème de connexion
- Assurez-vous que votre téléphone et ordinateur sont sur le même réseau WiFi
- Désactivez les VPN
- Vérifiez les pare-feu

## 📦 Build pour production

### Android APK
```bash
npx eas build --platform android --profile preview
```

### iOS
```bash
npx eas build --platform ios --profile preview
```

Note : Nécessite un compte Expo et la configuration d'EAS Build.

## 🎨 Personnalisation

### Changer les couleurs
Modifiez `tailwind.config.js` :
```js
colors: {
  primary: "rgb(52, 52, 52)",  // Votre couleur
  // ...
}
```

### Ajouter vos images
Placez vos images dans `assets/` et mettez à jour les chemins dans :
- `lib/mock-data.ts`
- `app.json` (icône et splash screen)

### Modifier le nom de l'app
Dans `app.json` :
```json
{
  "expo": {
    "name": "Votre Nom",
    "slug": "votre-slug"
  }
}
```

## 🚀 Prochaines étapes

1. Remplacez les données mock par une vraie API
2. Ajoutez la lecture vidéo avec `expo-av`
3. Implémentez les notifications push
4. Configurez l'authentification backend
5. Ajoutez le paiement en ligne

## 📚 Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native](https://reactnative.dev/)

## 💡 Conseils

- Utilisez `console.log()` pour déboguer
- Secouez votre téléphone pour ouvrir le menu développeur
- Rechargez avec `r` dans le terminal
- Ouvrez DevTools avec `j` dans le terminal

## ⚠️ Notes importantes

- Cette version utilise AsyncStorage (stockage local)
- Les données sont persistées sur l'appareil
- Pas de synchronisation entre appareils
- Pour une app production, utilisez une vraie base de données

## 🆘 Besoin d'aide ?

- [Forum Expo](https://forums.expo.dev/)
- [Discord Expo](https://chat.expo.dev/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
