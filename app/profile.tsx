import { Redirect } from "expo-router"
import { useAuth } from "@/lib/auth-context"

export default function ProfileRedirect() {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Redirect href="/login" />
  }
  
  return <Redirect href="/(tabs)/profile" />
}
