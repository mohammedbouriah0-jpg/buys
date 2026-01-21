# Configuration du Deep Linking pour Buys

## 🎯 Objectif

Quand quelqu'un partage un lien vidéo ou boutique :
- **Si l'app est installée** → Ouvre directement l'app
- **Si l'app n'est pas installée** → Ouvre le navigateur avec option de téléchargement

## ✅ Ce qui est déjà fait

### 1. Configuration App (app.json)
- ✅ Scheme personnalisé : `buys://`
- ✅ Universal Links iOS : `buysdz.com`
- ✅ App Links Android : `buysdz.com`
- ✅ Intent filters pour `/v/*` et `/s/*`

### 2. Code Frontend
- ✅ Deep link handler dans `app/_layout.tsx`
- ✅ Partage simplifié dans `lib/share-utils.ts`
- ✅ Format de liens : `https://buysdz.com/v/123` et `https://buysdz.com/s/456`

### 3. Code Backend
- ✅ Routes `/v/:id` et `/s/:id` qui servent des pages HTML
- ✅ Pages de redirection automatique vers l'app
- ✅ Fallback vers le Play Store si l'app n'est pas installée

## 🔧 Configuration requise côté serveur

### 1. Android App Links

Récupérer votre SHA-256 fingerprint :
```bash
# Pour le keystore de debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Pour le keystore de production
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

Mettre à jour `backend/public/.well-known/assetlinks.json` avec votre fingerprint.

Vérifier que le fichier est accessible :
```
https://buysdz.com/.well-known/assetlinks.json
```

### 2. iOS Universal Links

Mettre à jour `backend/public/.well-known/apple-app-site-association` avec votre Team ID Apple.

Vérifier que le fichier est accessible :
```
https://buysdz.com/.well-known/apple-app-site-association
```

### 3. Configuration Nginx/Apache

Assurer que les fichiers `.well-known` sont accessibles en HTTPS :

**Nginx :**
```nginx
location /.well-known/ {
    alias /path/to/backend/public/.well-known/;
    default_type application/json;
}

location ~ ^/(v|s)/[0-9]+ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Apache :**
```apache
Alias /.well-known /path/to/backend/public/.well-known
<Directory "/path/to/backend/public/.well-known">
    Header set Content-Type "application/json"
    Require all granted
</Directory>

ProxyPass /v/ http://localhost:3000/v/
ProxyPass /s/ http://localhost:3000/s/
```

## 🧪 Test

### Test Android
1. Partager une vidéo depuis l'app
2. Envoyer le lien par WhatsApp/Telegram
3. Cliquer sur le lien
4. L'app devrait s'ouvrir automatiquement

### Test iOS
1. Même procédure
2. Sur iOS, il faut que le certificat SSL soit valide
3. Les fichiers `.well-known` doivent être en HTTPS

### Test manuel
```bash
# Android
adb shell am start -a android.intent.action.VIEW -d "https://buysdz.com/v/1"

# iOS (depuis Safari)
Ouvrir: https://buysdz.com/v/1
```

## 📱 Format des liens

### Vidéo
- Web: `https://buysdz.com/v/123`
- Deep link: `buys://share/video/123`

### Boutique
- Web: `https://buysdz.com/s/456`
- Deep link: `buys://share/shop/456`

## 🐛 Debugging

### Vérifier les App Links Android
```bash
adb shell dumpsys package d
# Chercher "com.buys.app" et vérifier les domaines
```

### Vérifier les Universal Links iOS
Dans Xcode → Capabilities → Associated Domains
Doit contenir : `applinks:buysdz.com`

### Logs
- Android: `adb logcat | grep -i "buys"`
- iOS: Console Xcode

## 📝 Notes importantes

1. **HTTPS obligatoire** : Les Universal Links et App Links ne fonctionnent qu'en HTTPS
2. **Certificat SSL valide** : Pas de certificat auto-signé
3. **Fichiers .well-known** : Doivent être accessibles sans redirection
4. **Délai de propagation** : Peut prendre quelques heures après publication

## 🚀 Déploiement

Après mise à jour de la config :
1. Rebuild l'app : `eas build --platform android`
2. Publier sur le Play Store
3. Attendre validation Google (24-48h pour App Links)
4. Tester avec la version publiée
