import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getGroupStatus, leaveGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

const POLL_INTERVAL_MS = 4000;

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function GroupStatusScreen({ route, navigation }) {
  const { groupId, groupName, inviteCode } = route.params;
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getGroupStatus(token, groupId);
      setMembers(result.members);
    } catch (err) {
      console.log('Lỗi lấy trạng thái nhóm:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  const submittedCount = members.filter((m) => m.hasSubmitted).length;
  const progressRatio = members.length > 0 ? submittedCount / members.length : 0;
  const handleLeaveGroup = () => {
  Alert.alert(
    'Rời nhóm?',
    `Bạn sẽ không còn thấy "${groupName}" trong danh sách nhóm nữa.`,
    [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            await leaveGroup(token, { groupId });
            navigation.reset({ index: 0, routes: [{ name: 'MyGroups' }] });
          } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.error || err.message);
            setLeaving(false);
          }
        },
      },
    ]
  );
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{groupName}</Text>

      {inviteCode && (
        <View style={[styles.codeCard, shadow]}>
          <Text style={styles.codeLabel}>Mã mời — gửi cho bạn bè</Text>
          <Text style={styles.codeValue}>{inviteCode}</Text>
        </View>
      )}

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Tiến độ chia sẻ vị trí</Text>
          <Text style={styles.progressCount}>{submittedCount}/{members.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.userId}
          style={{ marginTop: spacing.md }}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <View style={[styles.memberRow, shadow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <Text style={styles.memberName}>{item.name}</Text>
              <View style={[styles.statusPill, item.hasSubmitted ? styles.statusPillDone : styles.statusPillPending]}>
                <Text style={[styles.statusText, item.hasSubmitted ? styles.statusTextDone : styles.statusTextPending]}>
                  {item.hasSubmitted ? '✓ Đã gửi' : 'Đang chờ'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('LocationInput', { groupId })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>📍 Chia sẻ vị trí của tôi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Suggestion', { groupId })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>☕ Xem gợi ý điểm hẹn</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleLeaveGroup} disabled={leaving} style={styles.leaveRow}>
        {leaving ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <Text style={styles.leaveText}>Rời nhóm</Text>
        )}
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
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.label,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 4,
    marginTop: spacing.xs,
  },
  progressBlock: {
    marginTop: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.subtitle,
  },
  progressCount: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.pill,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  memberName: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusPillDone: {
    backgroundColor: '#E9F0E5',
  },
  statusPillPending: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextDone: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.textSecondary,
  },
  actionRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.success,
  },
  leaveRow: { alignItems: 'center', paddingVertical: spacing.md },
  leaveText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
});