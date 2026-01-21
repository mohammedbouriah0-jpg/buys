import React, { useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native"
import { Link, usePathname } from "expo-router"
import { Home, Grid3X3, ShoppingBag, ShoppingCart, User, Store, Shield } from "lucide-react-native"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function NavItem({ item, isActive, showBadge, badgeCount }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isActive])

  const Icon = item.icon

  return (
    <Link href={item.href} asChild>
      <TouchableOpacity 
        style={styles.navItem}
        activeOpacity={0.6}
      >
        <Animated.View style={[
          styles.iconContainer,
          isActive && styles.iconContainerActive,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <Icon
            size={22}
            color={isActive ? "#fff" : "#6b7280"}
            strokeWidth={2.5}
          />
          {showBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 9 ? "9+" : badgeCount}
              </Text>
            </View>
          )}
        </Animated.View>
        {isActive && (
          <Animated.Text style={[styles.labelActive, { opacity: labelOpacity }]}>
            {item.label}
          </Animated.Text>
        )}
      </TouchableOpacity>
    </Link>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const { isAuthenticated, user } = useAuth()
  const { t, isRTL } = useLanguage()
  const insets = useSafeAreaInsets()
  
  const clientNavItems = [
    { href: "/", icon: Home, label: t('home') },
    { href: "/categories", icon: Grid3X3, label: t('categories') },
    { href: "/commandes", icon: ShoppingBag, label: t('orders') },
    { href: "/panier", icon: ShoppingCart, label: t('cart') },
  ]

  const shopNavItems = [
    { href: "/", icon: Home, label: t('home') },
    { href: "/gestion/orders", icon: ShoppingBag, label: t('orders') },
    { href: "/gestion", icon: Store, label: t('management') },
  ]

  const adminNavItems = [
    { href: "/", icon: Home, label: t('home') },
    { href: "/admin", icon: Shield, label: t('admin') },
  ]
  
  const navItems = user?.type === "admin" 
    ? adminNavItems 
    : user?.type === "shop" 
    ? shopNavItems 
    : clientNavItems

  // Inverser l'ordre des onglets en mode RTL (sauf le profil qui reste à droite)
  const displayNavItems = isRTL ? [...navItems].reverse() : navItems
  
  // Créer le profil item (sans prop `key` pour éviter le warning React)
  const profileItem = {
    item: { href: isAuthenticated ? "/profile" : "/login", icon: User, label: t('profile') },
    isActive: pathname === "/profile" || pathname === "/(tabs)/profile" || pathname === "/login",
    showBadge: false,
    badgeCount: 0,
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
      <View style={styles.nav}>
        {isRTL && (
          <NavItem key="profile" {...profileItem} />
        )}
        
        {displayNavItems.map((item) => {
          const isActive = pathname === item.href
          const showBadge = item.href === "/panier" && totalItems > 0

          return (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive}
              showBadge={showBadge}
              badgeCount={totalItems}
            />
          )
        })}

        {!isRTL && (
          <NavItem key="profile" {...profileItem} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    width: 48,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconContainerActive: {
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  labelActive: {
    fontSize: 10,
    color: "#000",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
})
