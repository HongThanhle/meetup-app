import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyGroups } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function MyGroupsScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const result = await getMyGroups(token);
      setGroups(result.groups);
    } catch (err) {
      console.log('Lỗi lấy danh sách nhóm:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Chào {user?.name?.split(' ').pop() || 'bạn'} 👋</Text>
        <Text style={styles.title}>Nhóm của bạn</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
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
                <Text style={styles.groupIconText}>☕</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{item.groupName}</Text>
                <Text style={styles.groupMeta}>{item.memberCount} thành viên</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyIcon}>🗒️</Text>
              <Text style={styles.emptyText}>Bạn chưa có nhóm nào.{'\n'}Tạo nhóm mới để bắt đầu hẹn gặp!</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('GroupCreateJoin')}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>+ Tạo nhóm / Tham gia</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutRow}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  greeting: { ...typography.subtitle },
  title: { ...typography.title, marginTop: spacing.xs },
  groupCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, gap: spacing.md,
  },
  groupIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  groupIconText: { fontSize: 20 },
  groupName: { ...typography.body, fontWeight: '700' },
  groupMeta: { ...typography.subtitle, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textSecondary },
  emptyBlock: { alignItems: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { ...typography.subtitle, textAlign: 'center', lineHeight: 20 },
  primaryButton: {
    backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 15,
    alignItems: 'center', marginTop: spacing.md,
  },
  primaryButtonText: { ...typography.button, color: '#fff' },
  logoutRow: { alignItems: 'center', paddingVertical: spacing.md },
  logoutText: { ...typography.subtitle },
});