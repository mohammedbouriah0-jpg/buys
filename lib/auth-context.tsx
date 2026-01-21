import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "./api";
import { registerPushToken, addNotificationResponseReceivedListener } from "./push-notifications";
import { router } from "expo-router";

export type UserType = "client" | "shop" | "admin";

export interface User {
  id: string | number;
  email: string;
  type: UserType;
  name: string;
  email_verified?: boolean;
  avatar?: string;
  phone?: string;
  address?: string;
  wilaya?: string;
  shopId?: number;
  shopName?: string;
  shopDescription?: string;
  shopLogo?: string;
  verified?: boolean;
  authProvider?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, type?: UserType) => Promise<boolean>;
  loginWithToken: (token: string, userData: User) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  type: UserType;
  name: string;
  shopName?: string;
  shopDescription?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();

    // Écouter les interactions avec les notifications
    const subscription = addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Naviguer vers l'écran approprié selon le type de notification
      if (data.type === 'new_order' && data.orderId) {
        router.push(`/order/${data.orderId}`);
      }
    });

    return () => subscription.remove();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("buys-user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to load user:", e);
    }
  };

  const saveUser = async (userData: User | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem("buys-user", JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem("buys-user");
      }
      setUser(userData);
    } catch (e) {
      console.error("Failed to save user:", e);
    }
  };

  const login = async (
    email: string,
    password: string,
    type?: UserType
  ): Promise<boolean> => {
    try {
      const result = await authAPI.login(email, password, type);
      await saveUser(result.user);

      if (!result.user.email_verified) {
        setTimeout(() => {
          router.replace('/verify-email');
        }, 100);
        return true;
      }

      if ((result.user.type === 'shop' || result.user.type === 'boutique') && result.token) {
        registerPushToken(result.token).catch(err => {
          console.log('Push token registration failed:', err.message);
        });
      }

      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  };

  // Connexion avec un token existant (pour Google Auth)
  const loginWithToken = async (token: string, userData: User): Promise<boolean> => {
    try {
      await AsyncStorage.setItem("auth_token", token);
      await saveUser(userData);

      if (userData.type === 'shop' && token) {
        registerPushToken(token).catch(err => {
          console.log('Push token error:', err.message);
        });
      }

      return true;
    } catch (e) {
      console.error("loginWithToken error:", e);
      return false;
    }
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    try {
      const result = await authAPI.register(data);
      await saveUser(result.user);
      
      // Rediriger vers la vérification email
      router.replace('/verify-email');
      
      return true;
    } catch (e) {
      console.error("Signup error:", e);
      return false;
    }
  };

  const logout = async () => {
    await authAPI.logout();
    await saveUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getProfile();
      await saveUser(userData);
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithToken,
        signup,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
