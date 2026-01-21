# 🔗 Flux complet du Deep Linking - Buys

## 📱 Scénario 1 : Partage d'une vidéo

### Étape 1 : Utilisateur partage
```typescript
// Frontend: lib/share-utils.ts
shareVideo({ videoId: 123 })
```

### Étape 2 : Génération du lien
```typescript
const webLink = `https://buysdz.com/v/123`
// Partage via WhatsApp, Telegram, etc.
```

### Étape 3 : Quelqu'un clique sur le lien

#### 3a. Si l'app est installée (Universal Links/App Links)
```
https://buysdz.com/v/123
    ↓
iOS/Android détecte que l'app gère ce domaine
    ↓
Ouvre directement l'app avec: buys://share/video/123
    ↓
app/_layout.tsx détecte le deep link
    ↓
router.replace('/(tabs)?videoId=123')
    ↓
L'app s'ouvre sur la vidéo 123
```

#### 3b. Si l'app n'est PAS installée
```
https://buysdz.com/v/123
    ↓
Ouvre le navigateur
    ↓
Backend: GET /v/123
    ↓
Sert: backend/public/share-video.html
    ↓
JavaScript tente: window.location = 'buys://share/video/123'
    ↓
Échec (app pas installée)
    ↓
Après 2s: Redirige vers Play Store/App Store
```

---

## 🏪 Scénario 2 : Partage d'une boutique

### Étape 1 : Utilisateur partage
```typescript
// Frontend: lib/share-utils.ts
shareShop({ shopId: 456 })
```

### Étape 2 : Génération du lien
```typescript
const webLink = `https://buysdz.com/s/456`
// Partage via WhatsApp, Telegram, etc.
```

### Étape 3 : Quelqu'un clique sur le lien

#### 3a. Si l'app est installée
```
https://buysdz.com/s/456
    ↓
iOS/Android détecte que l'app gère ce domaine
    ↓
Ouvre directement l'app avec: buys://share/shop/456
    ↓
app/_layout.tsx détecte le deep link
    ↓
router.push('/shop/456')
    ↓
L'app s'ouvre sur la boutique 456
```

#### 3b. Si l'app n'est PAS installée
```
https://buysdz.com/s/456
    ↓
Ouvre le navigateur
    ↓
Backend: GET /s/456
    ↓
Sert: backend/public/share-shop.html
    ↓
JavaScript tente: window.location = 'buys://share/shop/456'
    ↓
Échec (app pas installée)
    ↓
Après 2s: Redirige vers Play Store/App Store
```

---

## 🔧 Configuration technique

### Frontend (app.json)
```json
{
  "scheme": "buys",
  "ios": {
    "bundleIdentifier": "com.buys.app",
    "associatedDomains": ["applinks:buysdz.com"],
    "infoPlist": {
      "CFBundleURLSchemes": ["buys"]
    }
  },
  "android": {
    "package": "com.buys.app",
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          { "scheme": "https", "host": "buysdz.com", "pathPrefix": "/v" },
          { "scheme": "https", "host": "buysdz.com", "pathPrefix": "/s" }
        ]
      }
    ]
  }
}
```

### Frontend (app/_layout.tsx)
```typescript
// Écoute les deep links
Linking.addEventListener('url', handleDeepLink)

// Parse l'URL et navigue
if (url.includes('/v/')) {
  router.replace(`/(tabs)?videoId=${videoId}`)
} else if (url.includes('/s/')) {
  router.push(`/shop/${shopId}`)
}
```

### Backend (server.js)
```javascript
// Routes de partage
app.get('/v/:id', (req, res) => {
  res.sendFile('share-video.html')
})

app.get('/s/:id', (req, res) => {
  res.sendFile('share-shop.html')
})
```

### Backend (share-video.html / share-shop.html)
```javascript
// Extraire l'ID
const videoId = pathParts[pathParts.length - 1]

// Tenter d'ouvrir l'app
window.location = `buys://share/video/${videoId}`

// Fallback vers le store après 2s
setTimeout(() => {
  window.location.href = playStoreUrl
}, 2000)
```

---

## 📋 Checklist de déploiement

### iOS
- [ ] Certificat SSL valide sur `buysdz.com`
- [ ] Fichier accessible: `https://buysdz.com/.well-known/apple-app-site-association`
- [ ] Team ID Apple configuré dans le fichier
- [ ] Build avec `eas build --platform ios`
- [ ] Publier sur App Store

### Android
- [ ] Certificat SSL valide sur `buysdz.com`
- [ ] Fichier accessible: `https://buysdz.com/.well-known/assetlinks.json`
- [ ] SHA-256 fingerprint correct dans le fichier
- [ ] Build avec `eas build --platform android`
- [ ] Publier sur Play Store
- [ ] Attendre validation Google (24-48h)

### Backend
- [ ] Routes `/v/:id` et `/s/:id` fonctionnelles
- [ ] Fichiers `.well-known` servis en HTTPS
- [ ] Pages HTML testées sur mobile

---

## 🧪 Tests

### Test rapide
1. Partager une vidéo depuis l'app
2. Envoyer le lien par WhatsApp
3. Cliquer sur le lien
4. ✅ L'app devrait s'ouvrir automatiquement

### Test sans app
1. Désinstaller l'app
2. Cliquer sur un lien partagé
3. ✅ Page web → Bouton "Télécharger"

### Test navigateurs in-app
1. Ouvrir un lien dans WhatsApp/Facebook
2. ✅ Message pour ouvrir dans le navigateur

---

## 🎯 Formats de liens

| Type | Format web | Deep link | Destination |
|------|-----------|-----------|-------------|
| Vidéo | `https://buysdz.com/v/123` | `buys://share/video/123` | Accueil avec vidéo 123 |
| Boutique | `https://buysdz.com/s/456` | `buys://share/shop/456` | Page boutique 456 |

---

## 🔍 Debugging

### Logs Android
```bash
adb logcat | grep -i "buys\|deep"
```

### Logs iOS
Console Xcode → Chercher "Deep link"

### Vérifier App Links Android
```bash
adb shell dumpsys package d | grep -A 5 "com.buys.app"
```

### Tester manuellement
```bash
# Android
adb shell am start -a android.intent.action.VIEW -d "https://buysdz.com/v/1"

# iOS (depuis Safari)
Ouvrir: https://buysdz.com/v/1
```
