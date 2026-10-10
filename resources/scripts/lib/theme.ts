const gray = {
  50: '#f5f6f7',
  100: '#e9ecef',
  200: '#d7dce1',
  300: '#bbc2ca',
  400: '#9ca5af',
  500: '#78838f',
  600: '#39424b',
  700: '#272e35',
  800: '#171c21',
  900: '#11161b',
  950: '#0c1116',
};

const aqua = {
  50: '#effcfa',
  100: '#d2f1ed',
  200: '#a4e3dc',
  300: '#78d4cc',
  400: '#55c0b7',
  500: '#237c7f',
  600: '#20696d',
  700: '#1d5558',
  800: '#204448',
  900: '#1d363a',
  950: '#122528',
};

const yellow = {
  400: '#facc15',
  700: '#a16207',
};

const themeValues: Record<string, string> = {
  'colors.black': gray[950],
  'colors.gray.200': gray[200],
  'colors.gray.500': gray[500],
  'colors.gray.600': gray[600],
  'colors.gray.700': gray[700],
  'colors.gray.900': gray[900],
  'colors.cyan.300': aqua[300],
  'colors.cyan.400': aqua[400],
  'colors.cyan.700': aqua[700],
  'colors.yellow.400': yellow[400],
  'colors.yellow.700': yellow[700],
  'colors.blue.50': aqua[50],
  'colors.blue.300': aqua[300],
  'colors.blue.700': aqua[700],
  'fontFamily.sans': '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
  'fontFamily.header': '"IBM Plex Sans", "Roboto", system-ui, sans-serif',
  'fontFamily.mono':
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

export const theme = (path: string): string => {
  return themeValues[path] || '';
};

export const th = theme;
export default theme;
