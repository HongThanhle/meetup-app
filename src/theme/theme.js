// Bảng màu lấy cảm hứng từ không gian quán cà phê: nâu espresso, đất nung ấm,
// nền kem nhạt — tránh xanh dương SaaS mặc định để có cá tính riêng cho app.
export const colors = {
  background: '#FBF7F2',      // nền kem nhạt, ấm
  surface: '#FFFFFF',         // nền card/input
  surfaceMuted: '#F1EAE0',    // nền phụ, ô mã mời, badge chờ

  textPrimary: '#2C2119',     // nâu đậm gần đen, dùng cho chữ chính
  textSecondary: '#6F6257',   // nâu xám, dùng cho mô tả/phụ đề

  primary: '#4A3428',         // nâu espresso — nút chính, tiêu đề nhấn
  accent: '#BE6A43',          // đất nung — điểm nhấn, badge, icon
  success: '#6E8B5E',         // xanh rêu — trạng thái "đã gửi/thành công"
  danger: '#B3453D',          // đỏ đất — lỗi

  border: '#E8DED2',          // viền nhạt, đồng bộ tông ấm
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
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  body: { fontSize: 15, fontWeight: '400', color: colors.textPrimary },
  button: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
};

// Bóng đổ mềm, tông ấm thay vì xám mặc định
export const shadow = {
  shadowColor: '#4A3428',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};