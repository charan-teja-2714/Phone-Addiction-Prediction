import { MD3LightTheme } from 'react-native-paper';

// Google Digital Wellbeing–inspired teal palette
export const Colors = {
  // Primary palette — teal / blue-green
  primary: '#1A8E7D',
  primaryLight: '#4DB6A9',
  primaryDark: '#0D6B5E',

  // Surface / background
  background: '#F5F7F6',
  surface: '#FFFFFF',
  surfaceTint: '#EDF5F3',

  // Risk levels
  riskLow: '#4CAF7D',
  riskLowBg: '#E8F5EE',
  riskModerate: '#F0A830',
  riskModerateBg: '#FDF3E4',
  riskHigh: '#E05555',
  riskHighBg: '#FBEAE8',

  // Text
  textPrimary: '#1C2B2A',
  textSecondary: '#6B7E7D',
  textOnPrimary: '#FFFFFF',

  // Accents
  accent: '#5C8EBF',
  accentLight: '#A3C4E0',
  info: '#5C8EBF',
  infoBg: '#E8F1F8',

  // Category colours (donut chart & breakdowns)
  categorySocial: '#7B68EE',
  categoryGaming: '#FF7043',
  categoryEducation: '#4DB6A9',
  categoryOther: '#90A4AE',

  // Misc
  divider: '#DEE8E6',
  disabled: '#B0C4C2',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.accent,
    secondaryContainer: Colors.accentLight,
    background: Colors.background,
    surface: Colors.surface,
    surfaceVariant: Colors.surfaceTint,
    onPrimary: Colors.textOnPrimary,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.divider,
  },
  roundness: Radius.md,
};

export const getRiskColor = (level) => {
  switch (level) {
    case 'Low Addiction':
      return Colors.riskLow;
    case 'Moderate Addiction':
      return Colors.riskModerate;
    case 'High Addiction':
      return Colors.riskHigh;
    default:
      return Colors.textSecondary;
  }
};

export const getRiskBg = (level) => {
  switch (level) {
    case 'Low Addiction':
      return Colors.riskLowBg;
    case 'Moderate Addiction':
      return Colors.riskModerateBg;
    case 'High Addiction':
      return Colors.riskHighBg;
    default:
      return Colors.surfaceTint;
  }
};

export const getRiskIcon = (level) => {
  switch (level) {
    case 'Low Addiction':
      return 'shield-check';
    case 'Moderate Addiction':
      return 'shield-alert';
    case 'High Addiction':
      return 'shield-off';
    default:
      return 'shield-outline';
  }
};
