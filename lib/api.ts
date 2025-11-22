import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/config";

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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erreur upload");
  }

  return response.json();
};

// Auth API
export const authAPI = {
  register: async (data: any) => {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await AsyncStorage.setItem("auth_token", result.token);
    return result;
  },

  login: async (email: string, password: string, type?: "client" | "shop" | "admin") => {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, ...(type && { type }) }),
    });
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

  getComments: (id: string) => apiRequest(`/videos/${id}/comments`),

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

  getShopOrders: (page: number = 1, limit: number = 10) => 
    apiRequest(`/orders/shop?page=${page}&limit=${limit}`),

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
