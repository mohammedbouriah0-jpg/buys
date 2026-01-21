import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL, API_CONFIG } from "@/config";

// Base URL pour les médias (sans /api)
export const getMediaBaseUrl = () => {
  const protocol = API_CONFIG.USE_HTTPS ? 'https' : 'http';
  return `${protocol}://${API_CONFIG.SERVER_IP}`;
};

/**
 * Construit l'URL complète d'un média (vidéo, image, etc.)
 * Gère les URLs relatives et absolues
 * Préserve les URLs CDN (BunnyCDN, etc.)
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // Si c'est déjà une URL complète
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Vérifier si c'est une URL CDN (BunnyCDN) - ne pas la modifier
    if (path.includes('.b-cdn.net') || path.includes('bunnycdn.com')) {
      return path;
    }
    
    // Pour les autres URLs (ancien serveur), remplacer par la nouvelle adresse
    const oldUrlPattern = /^https?:\/\/[^/]+/;
    return path.replace(oldUrlPattern, getMediaBaseUrl());
  }
  
  // Si c'est un chemin relatif, construire l'URL complète
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getMediaBaseUrl()}${cleanPath}`;
};

// Get auth token
const getToken = async () => {
  return await AsyncStorage.getItem("auth_token");
};

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const url = `${API_URL}${endpoint}`;
  console.log("🌐 [API REQUEST]", options.method || "GET", url);
  console.log("🔑 [API REQUEST] Has token:", !!token);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log(
    "📡 [API RESPONSE] Status:",
    response.status,
    response.statusText
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ [API ERROR]", error);
    throw new Error(error.error || "Erreur réseau");
  }

  const data = await response.json();
  console.log("✅ [API SUCCESS] Data received");
  return data;
};

// Upload helper
const uploadRequest = async (endpoint: string, formData: FormData, method: string = "POST") => {
  const token = await getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  // Lire la réponse en texte d'abord
  const text = await response.text();

  if (!response.ok) {
    // Vérifier si c'est du HTML (erreur proxy/serveur)
    if (text.startsWith('<') || text.includes('<!DOCTYPE')) {
      console.error('❌ Upload error - Server returned HTML:', text.substring(0, 200));
      if (response.status === 413) {
        throw new Error("Fichier trop volumineux. Réduisez la taille.");
      }
      throw new Error("Erreur serveur. Vérifiez la taille du fichier.");
    }
    
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || "Erreur upload");
    } catch (e) {
      throw new Error("Erreur upload: " + response.status);
    }
  }

  // Parser le JSON de la réponse
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('❌ JSON parse error:', text.substring(0, 200));
    throw new Error("Réponse serveur invalide");
  }
};

// Auth API
export const authAPI = {
  register: async (data: any) => {
    const language = await AsyncStorage.getItem('app_language') || 'fr';
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, language }),
    });
    await AsyncStorage.setItem("auth_token", result.token);
    return result;
  },

  login: async (email: string, password: string, type?: "client" | "shop" | "admin") => {
    console.log('🔐 [API] Login request pour:', email);
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, ...(type && { type }) }),
    });
    console.log('📥 [API] Login response reçue:', JSON.stringify(result, null, 2));
    console.log('📥 [API] User data:', JSON.stringify(result.user, null, 2));
    console.log('📥 [API] email_verified:', result.user?.email_verified);
    console.log('📥 [API] email_verified type:', typeof result.user?.email_verified);
    await AsyncStorage.setItem("auth_token", result.token);
    return result;
  },

  logout: async () => {
    await AsyncStorage.removeItem("auth_token");
  },

  getProfile: () => apiRequest("/user/profile"),
};

// Products API
export const productsAPI = {
  getAll: (params?: {
    category?: number;
    shop_id?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/products${query ? "?" + query : ""}`);
  },

  getById: (id: string) => apiRequest(`/products/${id}`),

  getMyProducts: () => apiRequest("/products/my-products"),

  create: (formData: FormData) => uploadRequest("/products", formData),

  update: (id: string, data: any) => {
    // If data is FormData, use uploadRequest, otherwise use apiRequest
    if (data instanceof FormData) {
      return uploadRequest(`/products/${id}`, data, "PUT");
    }
    return apiRequest(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => apiRequest(`/products/${id}`, { method: "DELETE" }),

  // Likes
  getMyLikes: () => apiRequest("/products/my-likes"),
  
  likeProduct: (id: number) => apiRequest(`/products/${id}/like`, { method: "POST" }),
  
  unlikeProduct: (id: number) => apiRequest(`/products/${id}/like`, { method: "DELETE" }),
  
  checkLiked: (id: number) => apiRequest(`/products/${id}/liked`),
};

// Videos API
export const videosAPI = {
  getAll: (shop_id?: number, subscriptionsOnly?: boolean) => {
    const params = new URLSearchParams();
    if (shop_id) params.append("shop_id", shop_id.toString());
    if (subscriptionsOnly) params.append("subscriptions", "true");
    const query = params.toString();
    return apiRequest(`/videos${query ? "?" + query : ""}`);
  },

  getById: (id: string) => apiRequest(`/videos/${id}`),

  create: (formData: FormData) => uploadRequest("/videos", formData),

  getMyVideos: () => apiRequest("/videos/my-videos"),

  update: (id: string, data: any) =>
    apiRequest(`/videos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiRequest(`/videos/${id}`, { method: "DELETE" }),

  like: (id: string) => apiRequest(`/videos/${id}/like`, { method: "POST" }),

  view: (id: string) => apiRequest(`/videos/${id}/view`, { method: "POST" }),

  getComments: (id: string, page: number = 1, limit: number = 10) => 
    apiRequest(`/videos/${id}/comments?page=${page}&limit=${limit}`),

  addComment: (id: string, content: string, parent_id?: number) =>
    apiRequest(`/videos/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parent_id }),
    }),

  likeComment: (commentId: string) =>
    apiRequest(`/videos/comments/${commentId}/like`, { method: "POST" }),
};

// Shops API
export const shopsAPI = {
  getAll: () => apiRequest("/shops"),

  getById: (id: string) => apiRequest(`/shops/${id}`),

  getSubscribersCount: async (id: string) => {
    const data = await apiRequest(`/shops/${id}/subscribers-count`);
    return data.count || 0;
  },

  customize: (data: any) =>
    apiRequest("/shops/customize", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadLogo: (formData: FormData) => uploadRequest("/shops/logo", formData),

  uploadBanner: (formData: FormData) =>
    uploadRequest("/shops/banner", formData),

  subscribe: (id: string) =>
    apiRequest(`/shops/${id}/subscribe`, { method: "POST" }),

  unsubscribe: (id: string) =>
    apiRequest(`/shops/${id}/subscribe`, { method: "DELETE" }),

  checkSubscription: (id: string) =>
    apiRequest(`/shops/${id}/subscription-status`),

  getSubscriptions: () => apiRequest("/shops/subscriptions"),
};

// Orders API
export const ordersAPI = {
  getMyOrders: (page: number = 1, limit: number = 10) => 
    apiRequest(`/orders?page=${page}&limit=${limit}`),

  getMyOrdersCount: () => 
    apiRequest(`/orders/count`),

  getShopOrders: (page: number = 1, limit: number = 10) => 
    apiRequest(`/orders/shop?page=${page}&limit=${limit}`),

  getShopOrdersCount: () => 
    apiRequest(`/orders/shop/count`),

  getById: async (id: string) => {
    console.log("📡 [API] ordersAPI.getById - ID:", id);
    try {
      const result = await apiRequest(`/orders/${id}`);
      console.log("✅ [API] ordersAPI.getById - Succès:", result);
      return result;
    } catch (error) {
      console.error("❌ [API] ordersAPI.getById - Erreur:", error);
      throw error;
    }
  },

  create: (data: any) =>
    apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiRequest(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  requestReturn: (id: string, reason: string) =>
    apiRequest(`/orders/${id}/return`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// Cart API
export const cartAPI = {
  get: () => apiRequest("/cart"),

  add: (product_id: number, quantity: number, size?: string, color?: string) =>
    apiRequest("/cart", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, size, color }),
    }),

  update: (product_id: number, quantity: number, size?: string, color?: string) =>
    apiRequest(`/cart/${product_id}`, {
      method: "PUT",
      body: JSON.stringify({ quantity, size, color }),
    }),

  remove: (product_id: number, size?: string, color?: string) =>
    apiRequest(`/cart/${product_id}`, { 
      method: "DELETE",
      body: JSON.stringify({ size, color }),
    }),

  clear: () => apiRequest("/cart", { method: "DELETE" }),
};

// Categories API
export const categoriesAPI = {
  getAll: () => apiRequest("/categories"),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => apiRequest("/notifications"),
  getUnreadCount: () => apiRequest("/notifications/unread-count"),
  markAsRead: (id: number) =>
    apiRequest(`/notifications/${id}/read`, { method: "PUT" }),
  markAllAsRead: () =>
    apiRequest("/notifications/mark-all-read", { method: "PUT" }),
};

// User API
export const userAPI = {
  updateProfile: async (formData: FormData) => {
    const token = await getToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/user/profile`, {
      method: "POST",
      headers,
      body: formData,
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Profile update error:", text);
      try {
        const error = JSON.parse(text);
        throw new Error(error.error || "Erreur upload");
      } catch (e) {
        throw new Error("Erreur serveur");
      }
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON parse error:", text);
      throw new Error("Réponse serveur invalide");
    }
  },

  getProfile: () => apiRequest("/user/profile"),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest("/user/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Verification API
export const verificationAPI = {
  getStatus: () => apiRequest("/verification/status"),

  submit: (formData: FormData) => uploadRequest("/verification/submit", formData),

  getPending: () => apiRequest("/verification/pending"),

  approve: (shopId: string) =>
    apiRequest(`/verification/approve/${shopId}`, { method: "POST" }),

  reject: (shopId: string, reason: string) =>
    apiRequest(`/verification/reject/${shopId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// Email Verification API
export const emailVerificationAPI = {
  verifyCode: async (code: string, language?: string) => {
    const lang = await AsyncStorage.getItem('app_language') || language || 'fr';
    return apiRequest("/email-verification/verify-code", {
      method: "POST",
      body: JSON.stringify({ code, language: lang }),
    });
  },
  
  resendCode: async (language?: string) => {
    const lang = await AsyncStorage.getItem('app_language') || language || 'fr';
    return apiRequest("/email-verification/resend-code", {
      method: "POST",
      body: JSON.stringify({ language: lang }),
    });
  },
  
  getStatus: () =>
    apiRequest("/email-verification/status"),
};
