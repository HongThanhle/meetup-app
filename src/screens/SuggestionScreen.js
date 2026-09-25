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
import { getSuggestions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function SuggestionScreen({ route }) {
  const { groupId } = route.params;
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const result = await getSuggestions(token, groupId);
      setData(result);
    } catch (err) {
      setData(null);
      const message = err.response?.status === 503
        ? 'Dịch vụ bản đồ đang tạm thời không khả dụng. Vui lòng thử lại sau.'
        : err.response?.data?.error || 'Không lấy được gợi ý. Có thể chưa đủ người gửi vị trí.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchSuggestions();
    }, [fetchSuggestions])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gợi ý điểm hẹn</Text>

      {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} size="large" color={colors.primary} />}

      {!loading && data && (
        <>
          <View style={[styles.centroidCard, shadow]}>
            <Text style={styles.centroidLabel}>📍 Điểm trung tâm của nhóm</Text>
            <Text style={styles.centroidValue}>
              {data.centroid.lat.toFixed(5)}, {data.centroid.lng.toFixed(5)}
            </Text>
          </View>

          <FlatList
            data={data.suggestions}
            keyExtractor={(item) => String(item.id)}
            style={{ marginTop: spacing.md }}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item, index }) => (
              <View style={[styles.placeRow, shadow]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.distancePill}>
                  <Text style={styles.distanceText}>{item.distance.toFixed(2)} km</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyIcon}>☕</Text>
                <Text style={styles.emptyText}>Chưa tìm được quán nào gần đó.</Text>
              </View>
            }
          />
        </>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={fetchSuggestions} activeOpacity={0.85}>
        <Text style={styles.refreshText}>Làm mới</Text>
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
  centroidCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  centroidLabel: {
    ...typography.label,
  },
  centroidValue: {
    ...typography.body,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: colors.accent,
    fontSize: 13,
  },
  placeName: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  distancePill: {
    backgroundColor: '#E9F0E5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  distanceText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
  },
  refreshButton: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '700',
  },
});