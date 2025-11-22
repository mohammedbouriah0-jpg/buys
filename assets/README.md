# 📁 Assets

Ce dossier contient les ressources de l'application.

## 🖼️ Images requises

Placez vos images ici et mettez à jour les chemins dans `lib/mock-data.ts`.

### Logo et icônes
- `logo.png` - Logo de l'application (512x512px)
- `icon.png` - Icône de l'app (1024x1024px)
- `splash.png` - Écran de démarrage (1242x2436px)
- `adaptive-icon.png` - Icône adaptative Android (1024x1024px)

### Images des boutiques
- `fashion-store-logo.png`
- `tech-store-logo.png`
- `beauty-store-logo.jpg`

### Images des produits
- `summer-floral-dress.png`
- `leather-handbag.png`
- `bluetooth-earbuds.jpg`
- `modern-smartwatch.png`
- `face-serum.jpg`
- `makeup-palette.png`

### Thumbnails vidéos
- `fashion-video-vertical.jpg`
- `tech-gadgets-video.jpg`
- `beauty-routine-video.jpg`
- `fashion-styling-video.jpg`

## 📝 Notes

- Utilisez des images optimisées (WebP ou PNG compressé)
- Taille recommandée pour les produits : 800x800px
- Taille recommandée pour les vidéos : 1080x1920px (9:16)
- Format recommandé : WebP pour le web, PNG pour les icônes

## 🔄 Remplacement

Pour remplacer les placeholders :

1. Ajoutez vos images dans ce dossier
2. Mettez à jour `lib/mock-data.ts` :
   ```typescript
   image: require("../assets/votre-image.png")
   ```

## 🎨 Génération d'icônes

Utilisez un outil comme :
- [App Icon Generator](https://www.appicon.co/)
- [Figma](https://www.figma.com/)
- [Canva](https://www.canva.com/)

## 📱 Formats requis

### iOS
- App Icon: 1024x1024px (PNG sans transparence)
- Splash Screen: 1242x2436px

### Android
- App Icon: 1024x1024px (PNG avec transparence)
- Adaptive Icon: 1024x1024px (PNG avec transparence)
- Splash Screen: 1242x2436px

## ✅ Checklist

- [ ] Logo ajouté
- [ ] Icône app ajoutée
- [ ] Splash screen ajouté
- [ ] Images boutiques ajoutées
- [ ] Images produits ajoutées
- [ ] Thumbnails vidéos ajoutés
- [ ] Chemins mis à jour dans mock-data.ts
- [ ] app.json mis à jour avec les bons chemins
