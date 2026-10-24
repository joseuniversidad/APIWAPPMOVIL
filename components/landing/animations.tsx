import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Animaciones de la página de escritorio: secciones que aparecen al hacer scroll,
// carruseles infinitos, elementos que flotan y tarjetas que se levantan con el mouse.

type ScrollState = { scrollY: SharedValue<number>; viewport: SharedValue<number> };

const ScrollContext = createContext<ScrollState | null>(null);
const SectionContext = createContext<SharedValue<number> | null>(null);

export const ScrollProvider = ScrollContext.Provider;

// Sección que se "enciende" cuando entra en pantalla. Sus <Reveal> aparecen en cascada.
export function RevealSection({
  children,
  style,
  onTop,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onTop?: (y: number) => void;
}) {
  const scroll = useContext(ScrollContext);
  const top = useSharedValue(Number.MAX_SAFE_INTEGER);
  const shown = useSharedValue(scroll ? 0 : 1);

  useAnimatedReaction(
    () => (scroll ? scroll.viewport.value > 0 && scroll.scrollY.value + scroll.viewport.value > top.value + 120 : true),
    (visible) => {
      if (visible && shown.value === 0) shown.value = 1;
    }
  );

  return (
    <SectionContext.Provider value={shown}>
      <View
        style={style}
        onLayout={(event) => {
          top.value = event.nativeEvent.layout.y;
          onTop?.(event.nativeEvent.layout.y);
        }}>
        {children}
      </View>
    </SectionContext.Provider>
  );
}

type RevealFrom = 'up' | 'left' | 'right' | 'zoom';

export function Reveal({
  children,
  index = 0,
  from = 'up',
  style,
}: {
  children: ReactNode;
  index?: number;
  from?: RevealFrom;
  style?: StyleProp<ViewStyle>;
}) {
  const sectionShown = useContext(SectionContext);
  const always = useSharedValue(1);
  const shown = sectionShown ?? always;
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => shown.value,
    (value, previous) => {
      if (value === 1 && previous !== 1) {
        progress.value = withDelay(Math.min(index, 12) * 80, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => {
    const rest = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: [
        { translateY: from === 'up' ? rest * 40 : 0 },
        { translateX: from === 'left' ? -rest * 50 : from === 'right' ? rest * 50 : 0 },
        { scale: from === 'zoom' ? 0.9 + progress.value * 0.1 : 1 },
      ],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Fila que se desplaza sin fin. Los hijos se dibujan dos veces para que el corte no se note;
// usa margen a la derecha en cada elemento (no gap) para que la unión quede pareja.
export function Marquee({ children, speed = 40, reverse = false }: { children: ReactNode; speed?: number; reverse?: boolean }) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!width) return;
    x.value = reverse ? -width : 0;
    x.value = withRepeat(withTiming(reverse ? 0 : -width, { duration: (width / speed) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [width, reverse, speed, x]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={{ overflow: 'hidden', width: '100%' }}>
      <Animated.View style={[{ flexDirection: 'row', alignSelf: 'flex-start' }, animatedStyle]}>
        <View style={{ flexDirection: 'row' }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {children}
        </View>
        <View style={{ flexDirection: 'row' }} aria-hidden>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// Sube y baja suavemente, para decorar con chips de lenguajes.
export function Floating({
  children,
  distance = 10,
  duration = 2600,
  delay = 0,
  style,
}: {
  children: ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const y = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    y.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-distance, { duration, easing: ease }), withTiming(0, { duration, easing: ease })), -1, false)
    );
    return () => cancelAnimation(y);
  }, [delay, distance, duration, y]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Tarjeta que se levanta y resalta su borde al pasar el mouse.
export function HoverCard({
  children,
  style,
  hoverBorderColor,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  hoverBorderColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withTiming(hovered ? 1 : 0, { duration: 220, easing: Easing.out(Easing.quad) });
  }, [hovered, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 6 }, { scale: 1 + lift.value * 0.015 }],
  }));

  return (
    <Animated.View style={[{ height: '100%' }, animatedStyle]}>
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[{ height: '100%' }, style, hovered && hoverBorderColor ? { borderColor: hoverBorderColor } : null]}
        {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Cursor parpadeante del editor de código.
export function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1, false);
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 9, height: 18, backgroundColor: color, marginLeft: 1 }, animatedStyle]} />;
}

// Mezcla dos colores hex. Sirve para que colores muy oscuros (negro, azul marino) se lean en modo oscuro.
export function mixHex(color: string, other: string, amount: number) {
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
    const value = parseInt(full, 16);
    return Number.isNaN(value) ? [128, 128, 128] : [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const a = parse(color);
  const b = parse(other);
  return `#${a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount).toString(16).padStart(2, '0')).join('')}`;
}

export function luminance(color: string) {
  const [r, g, b] = mixHex(color, color, 0)
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => parseInt(part, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Color de marca listo para usar sobre el fondo actual.
export function readableColor(color: string | undefined, dark: boolean) {
  const base = color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#3b82f6';
  const light = luminance(base);
  if (dark && light < 0.3) return mixHex(base, '#ffffff', 0.45);
  if (!dark && light > 0.7) return mixHex(base, '#000000', 0.35);
  return base;
}
