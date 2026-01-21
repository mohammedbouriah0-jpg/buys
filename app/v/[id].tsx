import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

// Redirection pour les liens https://buysdz.com/v/:id
// Ouvre directement l'onglet d'accueil avec la navbar et la vidéo en première position
export default function ShortVideoLinkPage() {
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // Rediriger vers l'accueil avec navbar et vidéo en premier
    if (id) {
      setTimeout(() => {
        router.replace(`/(tabs)?videoId=${id}`);
      }, 300);
    }
  }, [id]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.text}>Chargement de la vidéo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  text: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
});
