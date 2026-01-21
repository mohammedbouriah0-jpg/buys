import { TouchableOpacity, Alert, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { shareVideo, shareShop, ShareVideoOptions, ShareShopOptions } from '@/lib/share-utils';

interface ShareButtonProps {
  type: 'video' | 'shop';
  data: ShareVideoOptions | ShareShopOptions;
  size?: number;
  color?: string;
  showBackground?: boolean;
}

export function ShareButton({ 
  type, 
  data, 
  size = 24, 
  color = '#fff',
  showBackground = true
}: ShareButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      
      if (type === 'video') {
        await shareVideo(data as ShareVideoOptions);
      } else {
        await shareShop(data as ShareShopOptions);
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Erreur', 'Impossible de partager');
      }
    } finally {
      setLoading(false);
    }
  };

  const content = loading ? (
    <ActivityIndicator size="small" color={color} />
  ) : (
    <Share2 size={size} color={color} />
  );

  if (!showBackground) {
    return (
      <TouchableOpacity onPress={handleShare} style={styles.simpleButton}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
      <View style={styles.actionIcon}>
        {content}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleButton: {
    padding: 8,
  },
});
