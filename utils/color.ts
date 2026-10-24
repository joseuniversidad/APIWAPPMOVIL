// Devuelve texto oscuro o claro según qué tan claro es el fondo (#RRGGBB),
// para que se lea bien sobre el color de cada lenguaje (amarillo de JS, azul oscuro de C++, etc.).
export function readableOn(hex: string): '#111111' | '#ffffff' {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return '#111111';
  const value = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  // Punto de cruce en el que el contraste con negro y con blanco es igual.
  return luminance > 0.179 ? '#111111' : '#ffffff';
}
