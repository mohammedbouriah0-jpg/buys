import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import SafeAreaWrapper from './safe-area-wrapper';
import { useResponsive, responsive } from '@/hooks/use-responsive';

interface SafeBottomButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'secondary' | 'black';
  icon?: React.ReactNode;
}

export default function SafeBottomButton({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon
}: SafeBottomButtonProps) {
  const { isSmall, moderateScale } = useResponsive();

  const getButtonColor = () => {
    switch (variant) {
      case 'danger':
        return '#ef4444';
      case 'secondary':
        return '#6b7280';
      case 'black':
        return '#000';
      default:
        return '#3b82f6';
    }
  };

  const responsiveStyles = {
    container: {
      paddingHorizontal: responsive.spacing(12, 16, 20, 24),
      paddingTop: responsive.spacing(10, 12, 14, 16),
    },
    button: {
      paddingVertical: responsive.spacing(14, 16, 18, 20),
      borderRadius: moderateScale(10),
    },
    buttonText: {
      fontSize: responsive.fontSize(14, 16, 17, 18),
    },
  };

  return (
    <SafeAreaWrapper position="bottom" backgroundColor="#fff">
      <View style={[styles.container, responsiveStyles.container]}>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          style={[
            styles.button,
            responsiveStyles.button,
            { backgroundColor: getButtonColor() },
            (disabled || loading) && styles.buttonDisabled
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" size={isSmall ? 'small' : 'large'} />
          ) : (
            <View style={styles.buttonContent}>
              {icon && <View style={styles.icon}>{icon}</View>}
              <Text 
                style={[styles.buttonText, responsiveStyles.buttonText]}
                numberOfLines={1}
                adjustsFontSizeToFit={isSmall}
              >
                {title}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
