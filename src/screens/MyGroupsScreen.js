import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyGroups } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function MyGroupsScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    try {
      const result = await getMyGroups(token);
      setGroups(result.groups);
      setError(null);
    } catch (err) {
      console.log('Lỗi lấy danh sách nhóm:', err.message);
      setError('Không thể tải danh sách nhóm. Kiểm tra kết nối rồi thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const refreshGroups = useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, [fetchGroups]);

  // Tự tải lại mỗi khi quay về màn hình này — ví dụ sau khi tạo nhóm mới hoặc rời nhóm
  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>CHÀO {user?.name?.split(' ').pop() || 'BẠN'}</Text>
        <View style={styles.headerMainRow}>
          <Text style={styles.title}>Nhóm hẹn gặp</Text>
          {!loading && !error && (
            <View style={styles.groupCount}>
              <Text style={styles.groupCountNumber}>{groups.length}</Text>
              <Text style={styles.groupCountLabel}>NHÓM</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
          style={styles.groupList}
          contentContainerStyle={[
            styles.groupListContent,
            groups.length === 0 && styles.groupListEmpty,
          ]}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshGroups}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.groupCard, shadow]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('GroupStatus', {
                  groupId: item.groupId,
                  groupName: item.groupName,
                  inviteCode: item.inviteCode,
                })
              }
            >
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{item.groupName}</Text>
                <View style={styles.groupMetaRow}>
                  <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.groupMeta}>{item.memberCount} thành viên</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            error ? (
              <View style={styles.emptyBlock}>
                <Ionicons name="cloud-offline-outline" size={38} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshGroups} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyBlock}>
                <Ionicons name="clipboard-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Bạn chưa có nhóm nào.{'\n'}Tạo nhóm mới để bắt đầu hẹn gặp!</Text>
              </View>
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('GroupCreateJoin')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.primaryButtonText}>Tạo nhóm / Tham gia</Text>
      </TouchableOpacity>

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
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  greeting: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  headerMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    ...typography.title,
    fontSize: 29,
  },
  groupCount: {
    minWidth: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  groupCountNumber: { color: '#fff', fontSize: 20, fontWeight: '800' },
  groupCountLabel: { color: '#D5E9E3', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  groupList: { flex: 1 },
  groupListContent: { gap: spacing.sm, paddingBottom: spacing.md },
  groupListEmpty: { flexGrow: 1 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: {
    fontSize: 20,
  },
  groupName: {
    ...typography.body,
    fontWeight: '700',
  },
  groupMeta: {
    ...typography.subtitle,
    fontSize: 12,
  },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    ...typography.subtitle,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
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
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: '#fff',
  },
  logoutRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...typography.subtitle,
  },
});