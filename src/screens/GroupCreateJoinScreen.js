import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createGroup, joinGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function GroupCreateJoinScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const [mode, setMode] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Lỗi', err.response?.data?.error || 'Mã mời không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Chào {user?.name?.split(' ').pop() || 'bạn'} 👋</Text>
        <Text style={styles.title}>Nhóm hẹn gặp</Text>
      </View>

      {mode === null && (
        <View style={styles.choiceStack}>
          <TouchableOpacity
            style={[styles.choiceCard, shadow]}
            onPress={() => setMode('create')}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.choiceIconText}>➕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Tạo nhóm mới</Text>
              <Text style={styles.choiceSubtitle}>Bắt đầu 1 buổi hẹn, mời bạn bè tham gia</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceCard, shadow]}
            onPress={() => setMode('join')}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.accent }]}>
              <Text style={styles.choiceIconText}>🔑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Tham gia bằng mã mời</Text>
              <Text style={styles.choiceSubtitle}>Nhập mã bạn bè vừa gửi cho bạn</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'create' && (
        <View style={[styles.card, shadow]}>
          <Text style={styles.fieldLabel}>Tên nhóm</Text>
          <TextInput
            style={styles.input}
            placeholder="Cà phê thứ 7"
            placeholderTextColor={colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Tạo nhóm</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)} style={styles.backRow}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'join' && (
        <View style={[styles.card, shadow]}>
          <Text style={styles.fieldLabel}>Mã mời</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="ABC123"
            placeholderTextColor={colors.textSecondary}
            value={inviteCodeInput}
            onChangeText={setInviteCodeInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Tham gia</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)} style={styles.backRow}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={logout} style={styles.logoutRow}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.subtitle,
  },
  title: {
    ...typography.title,
    marginTop: spacing.xs,
  },
  choiceStack: {
    gap: spacing.md,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  choiceIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconText: {
    fontSize: 22,
  },
  choiceTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  choiceSubtitle: {
    ...typography.subtitle,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
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
    marginBottom: spacing.md,
  },
  codeInput: {
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.button,
    color: '#fff',
  },
  backRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
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