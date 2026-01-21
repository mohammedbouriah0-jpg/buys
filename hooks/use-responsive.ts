import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');

export type DeviceSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface ResponsiveValues {
  width: number;
  height: number;
  deviceSize: DeviceSize;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
}

const getDeviceSize = (width: number): DeviceSize => {
  if (width < 375) return 'small';
  if (width < 414) return 'medium';
  if (width < 768) return 'large';
  return 'xlarge';
};

const baseWidth = 375;
const baseHeight = 812;

export const useResponsive = (): ResponsiveValues => {
  const [dimensions, setDimensions] = useState({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
  });

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const deviceSize = getDeviceSize(dimensions.width);

  const scale = (size: number) => (dimensions.width / baseWidth) * size;
  const verticalScale = (size: number) => (dimensions.height / baseHeight) * size;
  const moderateScale = (size: number, factor: number = 0.5) => 
    size + (scale(size) - size) * factor;

  return {
    width: dimensions.width,
    height: dimensions.height,
    deviceSize,
    isSmall: deviceSize === 'small',
    isMedium: deviceSize === 'medium',
    isLarge: deviceSize === 'large',
    isXLarge: deviceSize === 'xlarge',
    scale,
    verticalScale,
    moderateScale,
  };
};

export const responsive = {
  fontSize: (small: number, medium: number, large: number, xlarge?: number) => {
    const width = Dimensions.get('window').width;
    if (width < 375) return small;
    if (width < 414) return medium;
    if (width < 768) return large;
    return xlarge || large;
  },
  
  spacing: (small: number, medium: number, large: number, xlarge?: number) => {
    const width = Dimensions.get('window').width;
    if (width < 375) return small;
    if (width < 414) return medium;
    if (width < 768) return large;
    return xlarge || large;
  },
};
