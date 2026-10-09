import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroup, joinGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function GroupCreateJoinScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const [mode, setMode] = useState('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove();
  }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhóm.');
      return;
    }
    setLoading(true);
    try {
      const result = await createGroup(token, { groupName });
      navigation.navigate('GroupStatus', {
        groupId: result.groupId,
        groupName: result.groupName,
        inviteCode: result.inviteCode,
      });
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCodeInput.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mã mời.');
      return;
    }
    setLoading(true);
    try {
      const result = await joinGroup(token, { inviteCode: inviteCodeInput.trim().toUpperCase() });
      navigation.navigate('GroupStatus', {
        groupId: result.groupId,
        groupName: result.groupName,
      });
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Mã mời không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>LẬP KẾ HOẠCH</Text>
        </View>
        <Text style={styles.greeting}>Chào {user?.name?.split(' ').pop() || 'bạn'}</Text>
        <Text style={styles.title}>Bắt đầu cuộc hẹn</Text>
        <Text style={styles.headerHint}>Tạo nhóm mới hoặc tham gia cùng bạn bè.</Text>
      </View>

      <View style={styles.modeSwitch}>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'create' }}
          style={[styles.modeOption, mode === 'create' && styles.modeOptionSelected]}
          onPress={() => setMode('create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={18} color={mode === 'create' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.modeText, mode === 'create' && styles.modeTextSelected]}>Tạo nhóm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'join' }}
          style={[styles.modeOption, mode === 'join' && styles.modeOptionSelected]}
          onPress={() => setMode('join')}
          activeOpacity={0.85}
        >
          <Ionicons name="key-outline" size={18} color={mode === 'join' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.modeText, mode === 'join' && styles.modeTextSelected]}>Nhập mã mời</Text>
        </TouchableOpacity>
      </View>

      {mode === 'create' ? (
        <View style={[styles.formCard, shadow]}>
          <View style={styles.formHeading}>
            <View style={styles.formIcon}>
              <Ionicons name="people-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Tạo nhóm mới</Text>
              <Text style={styles.formSubtitle}>Đặt tên cho buổi hẹn của bạn</Text>
            </View>
          </View>
          <Text style={styles.fieldLabel}>Tên nhóm</Text>
          <View style={styles.inputShell}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Cà phê cuối tuần"
              placeholderTextColor={colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Tạo nhóm</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.formCard, shadow]}>
          <View style={styles.formHeading}>
            <View style={[styles.formIcon, styles.joinIcon]}>
              <Ionicons name="enter-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.formTitle}>Tham gia nhóm</Text>
              <Text style={styles.formSubtitle}>Nhập mã mời bạn nhận được</Text>
            </View>
          </View>
          <Text style={styles.fieldLabel}>Mã mời</Text>
          <View style={styles.inputShell}>
            <Ionicons name="key-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor={colors.textSecondary}
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Tham gia nhóm</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={logout} style={styles.logoutRow}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  greeting: {
    ...typography.subtitle,
  },
  title: {
    ...typography.title,
    fontSize: 30,
    marginTop: spacing.xs,
  },
  headerHint: {
    ...typography.subtitle,
    marginTop: spacing.xs,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    minHeight: 46,
    borderRadius: radius.sm,
  },
  modeOptionSelected: {
    backgroundColor: colors.surface,
    elevation: 2,
  },
  modeText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  modeTextSelected: { color: colors.primary, fontWeight: '800' },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
  },
  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  formIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: '#FCE9E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinIcon: { backgroundColor: colors.surfaceMuted },
  formTitle: { ...typography.body, fontSize: 18, fontWeight: '800' },
  formSubtitle: { ...typography.subtitle, fontSize: 12, marginTop: 2 },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  codeInput: {
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButtonText: {
    ...typography.button,
    color: '#fff',
  },
  logoutRow: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...typography.subtitle,
  },
});