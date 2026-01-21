import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

// Page de redirection pour les liens partagés de vidéos
// Redirige vers la page vidéo standalone pour une meilleure expérience
export default function ShareVideoPage() {
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // Rediriger vers l'accueil avec la vidéo partagée comme première vidéo (avec navbar)
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
