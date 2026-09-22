import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { login as apiLogin, register as apiRegister } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isRegisterMode && !name.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ.');
      return;
    }

    setLoading(true);
    try {
      const result = isRegisterMode
        ? await apiRegister({ name, email, password })
        : await apiLogin({ email, password });

      await login(result.token, result.user);
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>☕</Text>
          </View>
          <Text style={styles.appName}>Điểm Hẹn</Text>
          <Text style={styles.tagline}>Tìm nơi gặp nhau tiện nhất cho cả nhóm</Text>
        </View>

        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>
            {isRegisterMode ? 'Tạo tài khoản' : 'Chào bạn quay lại'}
          </Text>

          {isRegisterMode && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tên của bạn</Text>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="ban@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isRegisterMode ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <Text style={styles.switchTextAccent}>
                {isRegisterMode ? 'Đăng nhập' : 'Đăng ký'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeIcon: {
    fontSize: 26,
  },
  appName: {
    ...typography.title,
    fontSize: 28,
  },
  tagline: {
    ...typography.subtitle,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 20,
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: '#fff',
  },
  switchRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    ...typography.subtitle,
  },
  switchTextAccent: {
    color: colors.accent,
    fontWeight: '700',
  },
});