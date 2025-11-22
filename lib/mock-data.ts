export interface Shop {
  id: string
  name: string
  username: string
  avatar: string
  verified: boolean
  description: string
  followers: number
}

export interface Product {
  id: string
  shopId: string
  name: string
  price: number
  image: string
  description: string
  stock: number
  category: string
}

export interface Video {
  id: string
  shopId: string
  videoUrl: string
  thumbnail: string
  title: string
  views: number
  likes: number
  productIds: string[]
  comments: Comment[]
}

export interface Category {
  id: string
  name: string
  icon: string
  productCount: number
}

export interface Message {
  id: string
  shopId: string
  text: string
  sender: "user" | "shop"
  timestamp: string
  read: boolean
}

export interface Conversation {
  shopId: string
  lastMessage: Message
  unreadCount: number
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  text: string
  timestamp: string
  likes: number
}

export const mockCategories: Category[] = [
  { id: "mode", name: "Mode & Vêtements", icon: "👗", productCount: 245 },
  { id: "tech", name: "Électronique", icon: "📱", productCount: 189 },
  { id: "beaute", name: "Beauté & Soins", icon: "💄", productCount: 312 },
  { id: "maison", name: "Maison & Déco", icon: "🏠", productCount: 156 },
  { id: "sport", name: "Sport & Fitness", icon: "⚽", productCount: 98 },
  { id: "enfants", name: "Enfants & Bébés", icon: "🧸", productCount: 134 },
  { id: "cuisine", name: "Cuisine & Alimentation", icon: "🍳", productCount: 87 },
  { id: "livres", name: "Livres & Papeterie", icon: "📚", productCount: 76 },
]

export const mockShops: Shop[] = [
  {
    id: "1",
    name: "Mode Élégante",
    username: "@modeelegante",
    avatar: "https://via.placeholder.com/150",
    verified: true,
    description: "Vêtements tendance et accessoires de qualité",
    followers: 12500,
  },
  {
    id: "2",
    name: "Tech Store DZ",
    username: "@techstoredz",
    avatar: "https://via.placeholder.com/150",
    verified: true,
    description: "Électronique et gadgets high-tech",
    followers: 8900,
  },
  {
    id: "3",
    name: "Beauté & Soins",
    username: "@beautesoins",
    avatar: "https://via.placeholder.com/150",
    verified: true,
    description: "Produits de beauté et cosmétiques",
    followers: 15200,
  },
]

export const mockProducts: Product[] = [
  {
    id: "p1",
    shopId: "1",
    name: "Robe d'été fleurie",
    price: 4500,
    image: "https://via.placeholder.com/300",
    description: "Robe légère parfaite pour l'été",
    stock: 15,
    category: "mode",
  },
  {
    id: "p2",
    shopId: "1",
    name: "Sac à main cuir",
    price: 6800,
    image: "https://via.placeholder.com/300",
    description: "Sac en cuir véritable de haute qualité",
    stock: 8,
    category: "mode",
  },
  {
    id: "p3",
    shopId: "2",
    name: "Écouteurs Bluetooth",
    price: 3200,
    image: "https://via.placeholder.com/300",
    description: "Son cristallin et autonomie longue durée",
    stock: 25,
    category: "tech",
  },
  {
    id: "p4",
    shopId: "2",
    name: "Montre connectée",
    price: 8900,
    image: "https://via.placeholder.com/300",
    description: "Suivi santé et notifications intelligentes",
    stock: 12,
    category: "tech",
  },
  {
    id: "p5",
    shopId: "3",
    name: "Sérum visage",
    price: 2800,
    image: "https://via.placeholder.com/300",
    description: "Hydratation intense et anti-âge",
    stock: 30,
    category: "beaute",
  },
  {
    id: "p6",
    shopId: "3",
    name: "Palette maquillage",
    price: 4200,
    image: "https://via.placeholder.com/300",
    description: "20 teintes pour tous les looks",
    stock: 18,
    category: "beaute",
  },
]

export const mockVideos: Video[] = [
  {
    id: "v1",
    shopId: "1",
    videoUrl: "",
    thumbnail: "https://via.placeholder.com/400x700",
    title: "Nouvelle collection été 2025",
    views: 45200,
    likes: 3400,
    productIds: ["p1", "p2"],
    comments: [
      {
        id: "c1",
        userId: "demo-client",
        userName: "Sarah Benali",
        text: "Magnifique collection ! J'adore la robe fleurie 😍",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        likes: 12,
      },
      {
        id: "c2",
        userId: "user-2",
        userName: "Karim Meziane",
        text: "Les prix sont très raisonnables, merci !",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        likes: 8,
      },
    ],
  },
  {
    id: "v2",
    shopId: "2",
    videoUrl: "",
    thumbnail: "https://via.placeholder.com/400x700",
    title: "Les meilleurs gadgets tech",
    views: 32100,
    likes: 2800,
    productIds: ["p3", "p4"],
    comments: [
      {
        id: "c3",
        userId: "demo-client",
        userName: "Sarah Benali",
        text: "La montre connectée a l'air incroyable !",
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        likes: 15,
      },
    ],
  },
  {
    id: "v3",
    shopId: "3",
    videoUrl: "",
    thumbnail: "https://via.placeholder.com/400x700",
    title: "Ma routine beauté du matin",
    views: 58900,
    likes: 4200,
    productIds: ["p5", "p6"],
    comments: [
      {
        id: "c4",
        userId: "user-3",
        userName: "Amina Khelifi",
        text: "Merci pour ces conseils ! Je vais essayer le sérum",
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        likes: 20,
      },
    ],
  },
]

export const mockMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "m1",
      shopId: "1",
      text: "Bonjour ! Bienvenue chez Mode Élégante. Comment puis-je vous aider ?",
      sender: "shop",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true,
    },
    {
      id: "m2",
      shopId: "1",
      text: "Bonjour, est-ce que la robe fleurie est disponible en taille M ?",
      sender: "user",
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      read: true,
    },
  ],
}

export function getShopById(id: string): Shop | undefined {
  return mockShops.find((shop) => shop.id === id)
}

export function getProductsByShopId(shopId: string): Product[] {
  return mockProducts.filter((product) => product.shopId === shopId)
}

export function getProductById(id: string): Product | undefined {
  return mockProducts.find((product) => product.id === id)
}

export function getProductsByCategory(categoryId: string): Product[] {
  return mockProducts.filter((product) => product.category === categoryId)
}

export function getMessagesByShopId(shopId: string): Message[] {
  return mockMessages[shopId] || []
}
