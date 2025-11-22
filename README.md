# buys - Marketplace Vidéo (Expo/React Native)

Version Expo React Native de l'application buys - une marketplace vidéo style TikTok pour l'Algérie.

## 🚀 Installation

```bash
cd expo-app
npm install
# ou
pnpm install
```

## 📱 Lancement

```bash
# Démarrer le serveur de développement
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios

# Lancer sur Web
npm run web
```

## 🎨 Fonctionnalités

- ✅ Feed vidéo vertical avec scroll infini (style TikTok)
- ✅ Navigation par onglets (Accueil, Catégories, Messages, Commandes, Panier, Profil)
- ✅ Authentification (Client / Boutique)
- ✅ Gestion du panier
- ✅ Pages produits et boutiques
- ✅ Système de commentaires
- ✅ Likes et partages
- ✅ Messages entre clients et boutiques
- ✅ Design identique à la version Next.js

## 🛠️ Technologies

- **Expo** ~52.0.0
- **React Native** 0.76.5
- **Expo Router** (navigation basée sur les fichiers)
- **NativeWind** (Tailwind CSS pour React Native)
- **AsyncStorage** (stockage local)
- **Lucide React Native** (icônes)
- **TypeScript**

## 📁 Structure

```
expo-app/
├── app/                    # Routes (Expo Router)
│   ├── (tabs)/            # Routes avec navigation par onglets
│   │   ├── index.tsx      # Feed vidéo (page d'accueil)
│   │   ├── categories.tsx # Liste des catégories
│   │   ├── messages.tsx   # Conversations
│   │   ├── commandes.tsx  # Historique des commandes
│   │   ├── panier.tsx     # Panier d'achat
│   │   └── profile.tsx    # Profil utilisateur
│   ├── login.tsx          # Page de connexion
│   ├── shop/[id].tsx      # Page boutique
│   └── product/[id].tsx   # Page produit
├── components/            # Composants réutilisables
│   ├── bottom-nav.tsx     # Navigation inférieure
│   ├── video-card.tsx     # Carte vidéo
│   └── comments-sheet.tsx # Modal de commentaires
├── lib/                   # Logique métier
│   ├── auth-context.tsx   # Contexte d'authentification
│   ├── cart-context.tsx   # Contexte du panier
│   └── mock-data.ts       # Données de démonstration
└── assets/                # Images et ressources
```

## 🔑 Comptes de démonstration

**Client:**
- Email: `client@demo.dz`
- Mot de passe: `demo123`

**Boutique:**
- Email: `boutique@demo.dz`
- Mot de passe: `demo123`

## 🎯 Différences avec Next.js

Cette version Expo est une copie fidèle de la version Next.js avec les adaptations suivantes :

1. **Navigation** : Expo Router au lieu de Next.js App Router
2. **Composants** : React Native au lieu de HTML/CSS
3. **Styling** : NativeWind (Tailwind pour RN) au lieu de Tailwind CSS
4. **Stockage** : AsyncStorage au lieu de localStorage
5. **Images** : `<Image>` React Native au lieu de `<img>`
6. **Liens** : `<Link>` Expo Router au lieu de Next.js Link
7. **Scroll** : `<FlatList>` et `<ScrollView>` au lieu de divs scrollables

## 📝 Notes

- Les images utilisent des placeholders (via.placeholder.com)
- Remplacez-les par vos vraies images dans le dossier `assets/`
- Le design est identique pixel par pixel à la version Next.js
- Toutes les fonctionnalités sont préservées

## 🚧 À faire

- [ ] Ajouter les vraies images
- [ ] Implémenter la lecture vidéo (expo-av)
- [ ] Ajouter les animations (react-native-reanimated)
- [ ] Intégrer une vraie API backend
- [ ] Ajouter les notifications push
- [ ] Implémenter le partage natif
