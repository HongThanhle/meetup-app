// Bảng màu đô thị: xanh ngọc cho hành động, san hô cho điểm nhấn.
export const colors = {
  background: '#F3F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#E7EFEB',

  textPrimary: '#18312C',
  textSecondary: '#526761',

  primary: '#146356',
  accent: '#E76F51',
  success: '#2E7D62',
  danger: '#B4473F',

  border: '#D6E2DD',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: { fontSize: 26, fontFamily: 'BeVietnamPro_700Bold', color: colors.textPrimary, letterSpacing: 0 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
  button: { fontSize: 15, fontWeight: '600', letterSpacing: 0 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
};

// Bóng đổ mềm, tông ấm thay vì xám mặc định
export const shadow = {
  shadowColor: '#18312C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};