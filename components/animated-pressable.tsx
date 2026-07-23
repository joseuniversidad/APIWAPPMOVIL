import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable = forwardRef<View, PressableProps>(function AnimatedPressable(
  { style, onPressIn, onPressOut, ...rest },
  ref
) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReanimatedPressable
      ref={ref}
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        scale.value = withTiming(0.96, { duration: 100 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: 150 });
        onPressOut?.(event);
      }}
      {...rest}
    />
  );
});
