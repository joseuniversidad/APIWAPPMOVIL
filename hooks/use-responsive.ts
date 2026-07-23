import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isDesktop = width >= 1000;
  const numColumns = Math.max(1, Math.min(5, Math.floor(width / 340)));
  const contentMaxWidth = isDesktop ? 1040 : isTablet ? 760 : undefined;

  return { width, isTablet, isDesktop, numColumns, contentMaxWidth };
}
