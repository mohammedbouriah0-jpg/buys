# 🧪 Guide de test du Deep Linking

## 📋 Prérequis

1. ✅ App installée sur le téléphone (via Expo Go ou build APK/IPA)
2. ✅ Backend démarré et accessible
3. ✅ Téléphone sur le même réseau (si test local)

---

## 🎯 Test 1 : Deep Link Direct (Custom Scheme)

### Android
```bash
# Ouvrir une vidéo
adb shell am start -a android.intent.action.VIEW -d "buys://share/video/1"

# Ouvrir une boutique
adb shell am start -a android.intent.action.VIEW -d "buys://share/shop/1"
```

### iOS (depuis Safari)
1. Ouvrir Safari
2. Taper dans la barre d'adresse : `buys://share/video/1`
3. Appuyer sur "Ouvrir" quand iOS demande

### ✅ Résultat attendu
- L'app s'ouvre immédiatement
- Pour vidéo : Affiche la page d'accueil avec la vidéo 1
- Pour boutique : Affiche la page de la boutique 1

### 🔍 Logs à vérifier
Dans la console de l'app (Metro/Expo) :
```
🔗 Deep link received (raw): buys://share/video/1
🔗 Parsed - path: share/video/1
🔗 Extracted - videoId: 1
🎬 Navigating to home with video: 1
```

---

## 🎯 Test 2 : Lien Web (avec redirection)

### Étape 1 : Partager depuis l'app
1. Ouvrir l'app
2. Aller sur une vidéo
3. Cliquer sur "Partager"
4. Envoyer le lien par WhatsApp/Telegram à toi-même

### Étape 2 : Cliquer sur le lien
1. Ouvrir WhatsApp/Telegram
2. Cliquer sur le lien reçu

### ✅ Résultat attendu

#### Si l'app est installée :
- Le navigateur s'ouvre brièvement
- L'app se lance automatiquement
- La vidéo/boutique s'affiche

#### Si l'app n'est PAS installée :
- Le navigateur affiche une page "Ouverture de l'application"
- Après 2.5s : Redirige vers Play Store/App Store

### 🔍 Logs navigateur (Chrome DevTools Remote)
```
🚀 Script démarré
📍 URL actuelle: https://buysdz.com/v/1
🎬 Video ID: 1
📱 Android: true, iOS: false
🔗 Deep link généré: buys://share/video/1
🚀 Tentative ouverture app avec: buys://share/video/1
✅ Commande envoyée
⏱️ Timer démarré pour redirection store (2.5s)
```

---

## 🎯 Test 3 : Test manuel des pages HTML

### Sur ordinateur
1. Ouvrir : `http://localhost:3000/v/1` (ou `https://buysdz.com/v/1`)
2. Ouvrir la console (F12)
3. Vérifier les logs

### Sur téléphone
1. Ouvrir Chrome/Safari
2. Aller sur : `https://buysdz.com/v/1`
3. Observer le comportement

### ✅ Résultat attendu
- Page blanche avec logo Buys
- Message "Ouverture de l'application"
- Spinner qui tourne
- Après 2.5s : Redirection vers le store OU affichage des boutons

---

## 🎯 Test 4 : Navigateurs in-app (WhatsApp, Facebook)

### Test WhatsApp
1. Envoyer un lien dans WhatsApp
2. Cliquer dessus (s'ouvre dans le navigateur WhatsApp)

### ✅ Résultat attendu
- Message : "Ouvrir dans le navigateur"
- Bouton pour copier le lien ou ouvrir dans Chrome

---

## 🐛 Problèmes courants et solutions

### Problème 1 : L'app ne s'ouvre pas du tout

#### Cause possible : Scheme pas enregistré
**Solution :**
1. Vérifier `app.json` :
```json
{
  "scheme": "buys",
  "ios": {
    "infoPlist": {
      "CFBundleURLSchemes": ["buys"]
    }
  }
}
```
2. Rebuild l'app : `npx expo prebuild --clean`

#### Cause possible : App pas installée correctement
**Solution :**
1. Désinstaller complètement l'app
2. Réinstaller
3. Retester

### Problème 2 : Le lien ouvre le navigateur mais pas l'app

#### Cause : Universal Links/App Links pas configurés
**Solution temporaire :**
- Utiliser le scheme custom : `buys://share/video/1`
- Ça fonctionne immédiatement sans config serveur

**Solution permanente :**
1. Configurer `.well-known/assetlinks.json` (Android)
2. Configurer `.well-known/apple-app-site-association` (iOS)
3. Publier sur les stores

### Problème 3 : "Redirection vers store" même si l'app est installée

#### Cause : Timer trop court
**Solution :**
- Augmenter le délai dans les pages HTML (actuellement 2.5s)
- Ou désactiver la redirection auto pour tester

### Problème 4 : Erreur dans les logs de l'app

#### Logs à vérifier :
```bash
# Android
adb logcat | grep -i "buys\|deep\|link"

# iOS
# Voir dans Xcode Console
```

#### Erreurs communes :
- `No valid path in deep link` → Format d'URL incorrect
- `Deep link error` → Problème de parsing

---

## 📊 Checklist de test complète

### Avant de tester
- [ ] Backend démarré (`npm start` dans `/backend`)
- [ ] App installée sur le téléphone
- [ ] Téléphone et PC sur le même réseau (si local)

### Tests Android
- [ ] Deep link direct : `adb shell am start -a android.intent.action.VIEW -d "buys://share/video/1"`
- [ ] Lien web : Cliquer sur `https://buysdz.com/v/1` dans Chrome
- [ ] Partage WhatsApp : Partager et cliquer sur le lien
- [ ] Vérifier les logs : `adb logcat | grep -i buys`

### Tests iOS
- [ ] Deep link direct : Taper `buys://share/video/1` dans Safari
- [ ] Lien web : Cliquer sur `https://buysdz.com/v/1` dans Safari
- [ ] Partage iMessage : Partager et cliquer sur le lien
- [ ] Vérifier les logs dans Xcode Console

### Tests fonctionnels
- [ ] Vidéo s'affiche correctement après deep link
- [ ] Boutique s'affiche correctement après deep link
- [ ] Redirection vers store si app pas installée
- [ ] Message correct dans navigateurs in-app

---

## 🎓 Commandes utiles

### Voir les logs en temps réel
```bash
# Android
adb logcat -c && adb logcat | grep -i "buys\|deep\|link"

# Expo/Metro
# Les logs s'affichent automatiquement dans le terminal
```

### Tester avec curl
```bash
# Vérifier que la page HTML est servie
curl http://localhost:3000/v/1

# Vérifier les fichiers .well-known
curl https://buysdz.com/.well-known/assetlinks.json
curl https://buysdz.com/.well-known/apple-app-site-association
```

### Debug Chrome Remote (Android)
1. Connecter le téléphone en USB
2. Ouvrir Chrome : `chrome://inspect`
3. Cliquer sur "Inspect" sous le navigateur du téléphone
4. Voir les logs console de la page HTML

---

## 📞 Support

Si rien ne fonctionne :
1. Vérifier que le scheme `buys://` fonctionne en direct
2. Vérifier les logs de l'app
3. Vérifier les logs du navigateur (Chrome Remote)
4. Vérifier que le backend sert bien les pages HTML
5. Tester avec une URL simple : `http://localhost:3000/v/1`
