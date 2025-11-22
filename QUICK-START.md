# 🚀 Démarrage rapide - buys Expo

## Installation en 3 étapes

```bash
# 1. Installer les dépendances
cd expo-app
npm install

# 2. Démarrer l'app
npm start

# 3. Scanner le QR code avec Expo Go
```

C'est tout ! 🎉

## 📱 Tester l'application

### Sur téléphone (recommandé)
1. Installez **Expo Go** sur votre téléphone
2. Scannez le QR code affiché dans le terminal
3. L'app se charge automatiquement

### Sur émulateur
```bash
# Android
npm run android

# iOS (macOS uniquement)
npm run ios
```

## 🎮 Comptes de test

**Client :**
- Email: `client@demo.dz`
- Mot de passe: `demo123`

**Boutique :**
- Email: `boutique@demo.dz`
- Mot de passe: `demo123`

## 🎯 Fonctionnalités à tester

1. **Feed vidéo** : Scrollez verticalement pour voir les vidéos
2. **Likes** : Appuyez sur le cœur pour liker
3. **Commentaires** : Appuyez sur l'icône message
4. **Produits** : Cliquez sur un produit dans la vidéo
5. **Panier** : Ajoutez des produits au panier
6. **Boutiques** : Visitez les pages boutiques
7. **Messages** : Chattez avec les boutiques
8. **Profil** : Gérez votre compte

## 🔧 Commandes utiles

```bash
# Nettoyer le cache
npx expo start -c

# Ouvrir DevTools
# Appuyez sur 'j' dans le terminal

# Recharger l'app
# Appuyez sur 'r' dans le terminal
# OU secouez votre téléphone
```

## 📝 Structure du projet

```
expo-app/
├── app/              # Pages (routes)
├── components/       # Composants UI
├── lib/             # Logique métier
└── assets/          # Images
```

## 🎨 Personnalisation rapide

### Changer les couleurs
Éditez `tailwind.config.js` :
```js
colors: {
  primary: "rgb(52, 52, 52)",  // Votre couleur
}
```

### Changer le nom
Éditez `app.json` :
```json
{
  "expo": {
    "name": "Votre App"
  }
}
```

### Ajouter vos images
Placez-les dans `assets/` et mettez à jour `lib/mock-data.ts`

## 🐛 Problèmes ?

### L'app ne se charge pas
```bash
npx expo start -c
```

### Erreur de connexion
- Même WiFi pour téléphone et PC
- Désactivez le VPN
- Vérifiez le pare-feu

### Autre problème
Consultez `INSTALLATION.md` pour plus de détails

## 📚 Prochaines étapes

1. ✅ Testez toutes les fonctionnalités
2. 📝 Lisez `CONVERSION-NOTES.md` pour comprendre la conversion
3. 🎨 Personnalisez le design
4. 🔌 Connectez une vraie API
5. 📱 Buildez pour production

## 💡 Astuces

- Secouez votre téléphone pour ouvrir le menu dev
- Utilisez `console.log()` pour déboguer
- Rechargez avec `r` dans le terminal
- Les changements se rechargent automatiquement (Fast Refresh)

## 🎓 Apprendre plus

- [Documentation Expo](https://docs.expo.dev/)
- [React Native Tutorial](https://reactnative.dev/docs/tutorial)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)

## ✨ Bon développement !

Cette app est prête à l'emploi. Explorez le code, testez les fonctionnalités, et amusez-vous ! 🚀
