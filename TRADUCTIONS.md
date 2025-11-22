# 🌍 Guide des Traductions

L'application supporte maintenant 3 langues :
- 🇫🇷 Français (par défaut)
- 🇩🇿 العربية (Arabe)
- 🇬🇧 English (Anglais)

## 📦 Installation

Les packages nécessaires sont déjà installés :
- `i18next`
- `react-i18next`

## 🎯 Utilisation

### Dans un composant

```tsx
import { useLanguage } from '@/lib/i18n/language-context';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <View>
      <Text>{t('home')}</Text>
      <Text>{t('addToCart')}</Text>
    </View>
  );
}
```

### Ajouter le sélecteur de langue

Dans la page de profil, ajoutez :

```tsx
import { LanguageSelector } from '@/components/language-selector';

<LanguageSelector />
```

## 📝 Ajouter de nouvelles traductions

Éditez le fichier `expo-app/lib/i18n/translations.ts` :

```typescript
export const translations = {
  fr: {
    myNewKey: "Mon nouveau texte",
  },
  ar: {
    myNewKey: "النص الجديد",
  },
  en: {
    myNewKey: "My new text",
  }
};
```

## 🔄 Changer de langue

```tsx
const { setLanguage } = useLanguage();

// Changer en arabe
await setLanguage('ar');

// Changer en anglais
await setLanguage('en');

// Changer en français
await setLanguage('fr');
```

## 📱 RTL (Right-to-Left) pour l'arabe

Le système détecte automatiquement si la langue est l'arabe et active le mode RTL.
Pour une activation complète du RTL, il faut redémarrer l'application.

### Utilisation du RTL dans les composants

```tsx
import { useLanguage } from '@/lib/i18n/language-context';

function MyComponent() {
  const { t, isRTL } = useLanguage();
  
  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.text, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('myText')}
      </Text>
    </View>
  );
}
```

### Pages avec support RTL complet

- ✅ Page des commandes boutique (`app/gestion/orders.tsx`)
  - Tous les textes alignés correctement
  - Direction des layouts inversée pour l'arabe
  - Filtres, badges et boutons adaptés

## 🎨 Exemple d'intégration dans une page

```tsx
import { useLanguage } from '@/lib/i18n/language-context';

export default function ProductPage() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('product')}</Text>
      <Text>{t('price')}: 1000 DA</Text>
      <TouchableOpacity>
        <Text>{t('addToCart')}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🌟 Traductions disponibles

Consultez `expo-app/lib/i18n/translations.ts` pour voir toutes les clés disponibles :
- Navigation (home, categories, cart, orders, profile...)
- Common (search, loading, error, success, save, delete...)
- Auth (login, signup, logout, email, password...)
- Products (product, price, stock, addToCart...)
- Cart (emptyCart, total, checkout, quantity...)
- Orders (order, myOrders, pending, delivered, returned...)
  - **Nouvelles traductions pour commandes boutique** :
    - `returnedOrders` : Filtre pour les commandes retournées
    - `returned_badge` : Badge "RETOURNÉ" sur les commandes
    - `return_button` : Bouton "Retour" pour demander un retour
    - Support RTL complet pour l'arabe
- Shop (shop, verified, followers, follow...)
- Videos (video, likes, comments, share...)
- Settings (settings, language, notifications...)

## 💡 Conseils

1. **Utilisez toujours `t()` pour les textes** au lieu de textes en dur
2. **Ajoutez les traductions pour les 3 langues** en même temps
3. **Testez dans chaque langue** pour vérifier l'affichage
4. **Pour l'arabe**, vérifiez que le RTL fonctionne correctement

## 🚀 Prochaines étapes

Pour traduire toute l'application :
1. Remplacez progressivement les textes en dur par `t('key')`
2. Ajoutez les nouvelles clés dans `translations.ts`
3. Testez dans les 3 langues

Exemple de pages à traduire en priorité :
- Login/Signup
- Page d'accueil
- Page produit
- Panier
- Profil
