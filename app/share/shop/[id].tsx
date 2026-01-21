import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

// Page de redirection pour les liens partagés de boutiques
export default function ShareShopPage() {
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // Rediriger vers la page boutique dans l'app
    if (id) {
      router.replace(`/shop/${id}`);
    }
  }, [id]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#000" />
      <Text className="mt-4 text-gray-600">Chargement de la boutique...</Text>
    </View>
  );
}
