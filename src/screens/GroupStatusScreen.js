import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getGroupStatus, leaveGroup } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

const POLL_INTERVAL_MS = 4000;

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function GroupStatusScreen({ route, navigation }) {
  const { groupId, groupName, inviteCode } = route.params;
  const { token, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [finalizedPlace, setFinalizedPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getGroupStatus(token, groupId);
      setMembers(result.members);
      setFinalizedPlace(result.finalizedPlace || null);
      setError(null);
    } catch (err) {
      console.log('Lỗi lấy trạng thái nhóm:', err.message);
      setError('Không thể cập nhật trạng thái nhóm.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, groupId]);

  const refreshStatus = useCallback(() => {
    setRefreshing(true);
    fetchStatus();
  }, [fetchStatus]);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  const submittedCount = members.filter((m) => m.hasSubmitted).length;
  const progressRatio = members.length > 0 ? submittedCount / members.length : 0;

  const openFinalizedPlace = async () => {
    if (!finalizedPlace) return;

    const query = Number.isFinite(finalizedPlace.lat) && Number.isFinite(finalizedPlace.lng)
      ? `${finalizedPlace.lat},${finalizedPlace.lng}`
      : `${finalizedPlace.name} ${finalizedPlace.address || ''}`.trim();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Không mở được bản đồ', err.message || 'Vui lòng thử lại.');
    }
  };

  const handleLeaveGroup = () => {
    const currentMember = members.find((member) => member.userId === String(user?.id));
    const isLastMember = members.length === 1;
    const confirmationMessage = currentMember?.isLeader
      ? isLastMember
        ? `Bạn là thành viên cuối cùng. Khi rời, "${groupName}" cùng vị trí và bình chọn sẽ bị xóa.`
        : `Bạn là trưởng nhóm. Quyền trưởng nhóm sẽ được chuyển cho thành viên tham gia sớm nhất trước khi bạn rời nhóm.`
      : `Bạn sẽ không còn thấy "${groupName}" trong danh sách nhóm nữa.`;

    Alert.alert(
      'Rời nhóm?',
      confirmationMessage,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              const result = await leaveGroup(token, { groupId });
              // Quay về màn hình danh sách nhóm, xóa hẳn màn hình nhóm này khỏi lịch sử điều hướng
              navigation.reset({ index: 0, routes: [{ name: 'MyGroups' }] });
              if (result.newLeader) {
                Alert.alert('Đã chuyển trưởng nhóm', `${result.newLeader} hiện là trưởng nhóm mới.`);
              } else if (result.groupDeleted) {
                Alert.alert('Đã xóa nhóm', 'Nhóm và dữ liệu vị trí, bình chọn đã được xóa.');
              }
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

      {finalizedPlace && (
        <View style={[styles.finalizedCard, shadow]}>
          <View style={styles.finalizedIcon}>
            <Ionicons name="flag" size={20} color={colors.success} />
          </View>
          <View style={styles.finalizedDetails}>
            <Text style={styles.finalizedLabel}>ĐỊA ĐIỂM ĐÃ CHỐT</Text>
            <Text style={styles.finalizedName}>{finalizedPlace.name}</Text>
            {finalizedPlace.address ? (
              <Text style={styles.finalizedAddress} numberOfLines={2}>{finalizedPlace.address}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.finalizedMapButton}
              onPress={openFinalizedPlace}
              activeOpacity={0.85}
            >
              <Ionicons name="map-outline" size={15} color={colors.primary} />
              <Text style={styles.finalizedMapButtonText}>Mở trên bản đồ</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {inviteCode && (
        <View style={[styles.codeCard, shadow]}>
          <View style={styles.codeCopy}>
            <Text style={styles.codeLabel}>MÃ MỜI</Text>
            <Text style={styles.codeValue}>{inviteCode}</Text>
          </View>
          <View style={styles.codeIcon}>
            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
          </View>
        </View>
      )}

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>Vị trí đã chia sẻ</Text>
            <Text style={styles.progressHint}>Cập nhật tự động</Text>
          </View>
          <Text style={styles.progressCount}>{submittedCount}/{members.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </View>

      <View style={styles.memberHeading}>
        <Text style={styles.memberHeadingTitle}>Thành viên</Text>
        <Text style={styles.memberHeadingCount}>{members.length}</Text>
      </View>

      {error && members.length > 0 && (
        <View style={styles.warningBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
          <Text style={styles.warningText}>{error} Đang hiển thị dữ liệu gần nhất.</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.userId}
          style={{ marginTop: spacing.md }}
          contentContainerStyle={[styles.memberListContent, !members.length && styles.memberListEmpty]}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshStatus}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )}
          renderItem={({ item }) => (
            <View style={[styles.memberRow, shadow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <View style={styles.memberIdentity}>
                <Text style={styles.memberName}>{item.name}</Text>
                <View style={[styles.rolePill, item.isLeader && styles.leaderPill]}>
                  <Text style={[styles.roleText, item.isLeader && styles.leaderText]}>
                    {item.isLeader ? 'Trưởng nhóm' : 'Thành viên'}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusPill, item.hasSubmitted ? styles.statusPillDone : styles.statusPillPending]}>
                <Text style={[styles.statusText, item.hasSubmitted ? styles.statusTextDone : styles.statusTextPending]}>
                  {item.hasSubmitted ? '✓ Đã gửi' : 'Đang chờ'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyBlock}>
              <Ionicons
                name={error ? 'cloud-offline-outline' : 'people-outline'}
                size={34}
                color={error ? colors.danger : colors.textSecondary}
              />
              <Text style={[styles.emptyText, error && styles.emptyErrorText]}>
                {error || 'Nhóm chưa có thành viên nào.'}
              </Text>
              {error && (
                <TouchableOpacity style={styles.retryButton} onPress={refreshStatus} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              )}
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
          <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryButtonText}>Chia sẻ vị trí của tôi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Suggestion', { groupId })}
          activeOpacity={0.85}
        >
          <Ionicons name="cafe" size={18} color={colors.success} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryButtonText}>Xem gợi ý điểm hẹn</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleLeaveGroup}
        disabled={leaving}
        style={styles.leaveRow}
      >
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
    textAlign: 'left',
    marginTop: spacing.sm,
  },
  finalizedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  finalizedIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: '#E9F0E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizedDetails: {
    flex: 1,
  },
  finalizedLabel: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  finalizedName: {
    ...typography.body,
    fontWeight: '800',
    marginTop: 3,
  },
  finalizedAddress: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  finalizedMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  finalizedMapButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  codeCopy: { gap: 2 },
  codeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLabel: {
    color: '#D5E9E3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
  },
  progressBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.body,
    fontWeight: '700',
  },
  progressHint: {
    ...typography.subtitle,
    fontSize: 11,
    marginTop: 2,
  },
  progressCount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
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
  memberHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  memberHeadingTitle: { ...typography.body, fontWeight: '800' },
  memberHeadingCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#F8E4E1',
  },
  warningText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 17 },
  memberListContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  memberListEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyBlock: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyText: { ...typography.subtitle, textAlign: 'center', marginTop: spacing.sm },
  emptyErrorText: { color: colors.danger },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  retryText: { ...typography.button, color: colors.primary },
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
    fontWeight: '600',
  },
  memberIdentity: {
    flex: 1,
    gap: 4,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  leaderPill: {
    backgroundColor: '#E7EFEB',
  },
  roleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  leaderText: {
    color: colors.primary,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.success,
  },
  leaveRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  leaveText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});