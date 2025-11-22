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
  avatar?: string;
  phone?: string;
  address?: string;
  shopId?: number;
  shopName?: string;
  shopDescription?: string;
  shopLogo?: string;
  verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, type?: UserType) => Promise<boolean>;
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

      // Enregistrer le token push si l'utilisateur est une boutique
      if (result.user.type === 'shop' && result.token) {
        registerPushToken(result.token).catch(err => {
          console.error('Erreur enregistrement push token:', err);
        });
      }

      return true;
    } catch (e) {
      console.error("Login error:", e);
      return false;
    }
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    try {
      const result = await authAPI.register(data);
      await saveUser(result.user);
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
