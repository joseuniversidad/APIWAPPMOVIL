import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

// Piezas comunes del login y el registro.
export const DANGER = '#d9534f';
export const SUCCESS = '#2e9e5b';

export function useFormColors() {
  const colorScheme = useColorScheme() ?? 'light';
  return {
    palette: Colors[colorScheme],
    border: colorScheme === 'dark' ? '#2a2d2e' : '#dcdcdc',
    surface: colorScheme === 'dark' ? '#1d2022' : '#f4f6f8',
  };
}

type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  valid?: boolean;
  password?: boolean;
};

export const AuthField = forwardRef<TextInput, FieldProps>(function AuthField({ label, icon, valid, password, style, ...rest }, ref) {
  const { palette, border, surface } = useFormColors();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={[styles.inputWrap, { borderColor: valid ? SUCCESS : border, backgroundColor: surface }]}>
        <Ionicons name={icon} size={18} color={palette.icon} />
        <TextInput
          ref={ref}
          placeholderTextColor={palette.icon}
          secureTextEntry={password && !visible}
          style={[styles.input, { color: palette.text }, style]}
          {...rest}
        />
        {valid && <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />}
        {password && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.icon} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

export function FormButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { palette, border } = useFormColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: palette.tint } : { borderWidth: 1, borderColor: border },
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? palette.background : palette.tint} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={primary ? palette.background : palette.tint} />}
          <ThemedText type="defaultSemiBold" style={{ color: primary ? palette.background : palette.tint }}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

export function FormMessage({ text, tone = 'error' }: { text: string; tone?: 'error' | 'success' }) {
  const color = tone === 'error' ? DANGER : SUCCESS;
  return (
    <View style={styles.message}>
      <Ionicons name={tone === 'error' ? 'alert-circle' : 'checkmark-circle'} size={16} color={color} />
      <ThemedText style={{ color, flex: 1, fontSize: 14 }}>{text}</ThemedText>
    </View>
  );
}

// En tablet y escritorio el formulario va dentro de una tarjeta para que no flote en una pantalla enorme.
export function FormCard({ children }: { children: ReactNode }) {
  const { border, surface } = useFormColors();
  const { isTablet } = useResponsive();
  return (
    <View style={[styles.form, isTablet && [styles.formCard, { borderColor: border, backgroundColor: surface }]]}>
      {children}
    </View>
  );
}

// Contenedor de las pantallas de cuenta: centrado, con ancho máximo y que sube con el teclado.
export function AuthScreen({ children, center = true }: { children: ReactNode; center?: boolean }) {
  const { palette } = useFormColors();
  const { height } = useWindowDimensions();
  const { width, isTablet } = useResponsive();
  // Celulares pequeños o en horizontal: menos aire para que todo quepa sin tanto scroll.
  const compact = width < 360 || height < 640;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.screen,
            compact && styles.screenCompact,
            isTablet && styles.screenWide,
            center && { justifyContent: 'center' },
          ]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  screenCompact: {
    padding: 16,
    gap: 16,
  },
  screenWide: {
    maxWidth: 480,
    paddingVertical: 48,
  },
  form: {
    gap: 14,
  },
  formCard: {
    padding: 28,
    borderWidth: 1,
    borderRadius: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 14,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
