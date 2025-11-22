import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Product } from "./mock-data"
import { cartAPI } from "./api"
import { useAuth } from "./auth-context"

interface CartItem {
  product: Product
  quantity: number
  selectedSize?: string
  selectedColor?: string
  size?: string
  color?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity: number, size?: string, color?: string) => Promise<void>
  removeItem: (productId: string, size?: string, color?: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  totalItems: number
  totalPrice: number
  loading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      loadCartFromBackend()
    } else {
      loadCartFromStorage()
    }
  }, [isAuthenticated])

  const loadCartFromBackend = async () => {
    try {
      setLoading(true)
      const data = await cartAPI.get()
      
      // Le backend renvoie { items, total }
      const backendItems = data.items || []
      
      const cartItems = backendItems.map((item: any) => ({
        product: {
          id: item.product_id.toString(),
          name: item.name,
          price: item.price,
          image: item.image_url || 'https://via.placeholder.com/200',
          stock: item.stock || 999,
          description: '',
          category: '',
          shopId: item.shop_id,
        },
        quantity: item.quantity,
        selectedSize: item.size || undefined,
        selectedColor: item.color || undefined,
      }))
      setItems(cartItems)
    } catch (error) {
      console.error("Failed to load cart from backend:", error)
      loadCartFromStorage()
    } finally {
      setLoading(false)
    }
  }

  const loadCartFromStorage = async () => {
    try {
      const savedCart = await AsyncStorage.getItem("buys-cart")
      if (savedCart) {
        setItems(JSON.parse(savedCart))
      }
    } catch (e) {
      console.error("Failed to load cart from storage:", e)
    }
  }

  const saveCartToStorage = async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem("buys-cart", JSON.stringify(cartItems))
    } catch (e) {
      console.error("Failed to save cart:", e)
    }
  }

  const addItem = async (product: Product, quantity: number, size?: string, color?: string) => {
    console.log('🛒 [CART] Adding item:', { product: product.name, quantity, size, color });
    
    const newItems = (() => {
      // For products with variants, check id + size + color combination
      const existingItem = items.find((item) => 
        item.product.id === product.id && 
        item.selectedSize === size && 
        item.selectedColor === color
      )
      if (existingItem) {
        return items.map((item) =>
          item.product.id === product.id && 
          item.selectedSize === size && 
          item.selectedColor === color
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        )
      }
      return [...items, { product, quantity, selectedSize: size, selectedColor: color }]
    })()
    
    console.log('🛒 [CART] New cart items:', newItems);
    setItems(newItems)
    await saveCartToStorage(newItems)

    if (isAuthenticated) {
      try {
        await cartAPI.add(parseInt(product.id), quantity, size, color)
      } catch (error) {
        console.error("Failed to add to backend cart:", error)
      }
    }
  }

  const removeItem = async (productId: string, size?: string, color?: string) => {
    console.log('🗑️ Suppression produit:', productId, 'Taille:', size, 'Couleur:', color);
    console.log('📦 Items avant:', items.length);
    
    const newItems = items.filter((item) => {
      const match = item.product.id === productId && item.selectedSize === size && item.selectedColor === color;
      console.log(`  Item ${item.product.id}: size=${item.selectedSize} color=${item.selectedColor} match=${!match}`);
      return !match;
    });
    
    console.log('📦 Items après:', newItems.length);
    setItems(newItems);
    await saveCartToStorage(newItems);

    if (isAuthenticated) {
      try {
        await cartAPI.remove(parseInt(productId), size, color);
      } catch (error) {
        console.error("Failed to remove from backend cart:", error);
      }
    }
  }

  const updateQuantity = async (productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity <= 0) {
      await removeItem(productId, size, color)
      return
    }
    
    const newItems = items.map((item) => 
      item.product.id === productId && item.selectedSize === size && item.selectedColor === color
        ? { ...item, quantity } 
        : item
    )
    setItems(newItems)
    await saveCartToStorage(newItems)

    if (isAuthenticated) {
      try {
        await cartAPI.update(parseInt(productId), quantity, size, color)
      } catch (error) {
        console.error("Failed to update backend cart:", error)
      }
    }
  }

  const clearCart = async () => {
    setItems([])
    await saveCartToStorage([])

    if (isAuthenticated) {
      try {
        await cartAPI.clear()
      } catch (error) {
        console.error("Failed to clear backend cart:", error)
      }
    }
  }

  const refreshCart = async () => {
    if (isAuthenticated) {
      await loadCartFromBackend()
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        totalPrice,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}
