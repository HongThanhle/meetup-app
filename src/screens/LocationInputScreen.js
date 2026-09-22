import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import {
  submitGPSLocation,
  geocodePreview,
  confirmManualLocation,
  reverseGeocode,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export default function LocationInputScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { token } = useAuth();

  const [mode, setMode] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const handleUseGPS = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập vị trí', 'Vui lòng cấp quyền GPS để tiếp tục.');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      let matchedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        const result = await reverseGeocode(token, { lat, lng });
        matchedAddress = result.address;
      } catch (geoErr) {
        console.log('Không lấy được tên địa chỉ:', geoErr.message);
      }

      setConfirmData({ lat, lng, matchedAddress, source: 'gps' });
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAddress = async () => {
    if (!addressText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ.');
      return;
    }
    setLoading(true);
    try {
      const result = await geocodePreview(token, { address: addressText });
      setConfirmData({ ...result, source: 'manual' });
    } catch (err) {
      Alert.alert('Không tìm được địa chỉ', 'Thử nhập địa chỉ chi tiết hơn.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAddress = async (confirmed) => {
    if (!confirmed) {
      setConfirmData(null);
      return;
    }
    setLoading(true);
    try {
      if (confirmData.source === 'gps') {
        await submitGPSLocation(token, {
          groupId,
          lat: confirmData.lat,
          lng: confirmData.lng,
        });
      } else {
        await confirmManualLocation(token, {
          groupId,
          lat: confirmData.lat,
          lng: confirmData.lng,
          address: addressText,
        });
      }
      Alert.alert('Thành công', 'Đã lưu vị trí!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (confirmData) {
    return (
      <View style={styles.container}>
        <View style={[styles.confirmCard, shadow]}>
          <View style={styles.pinBadge}>
            <Text style={styles.pinBadgeIcon}>📍</Text>
          </View>
          <Text style={styles.confirmLabel}>
            {confirmData.source === 'gps' ? 'Vị trí hiện tại của bạn' : 'Ý bạn có phải là'}
          </Text>
          <Text style={styles.confirmAddress}>{confirmData.matchedAddress}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleConfirmAddress(true)}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Đúng, xác nhận</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => handleConfirmAddress(false)}
            disabled={loading}
          >
            <Text style={styles.ghostButtonText}>Sửa lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Chia sẻ vị trí của bạn</Text>
      <Text style={styles.subtitle}>Chọn cách bạn muốn cho biết mình đang ở đâu</Text>

      {mode === null && (
        <View style={styles.choiceStack}>
          <TouchableOpacity
            style={[styles.choiceCard, shadow]}
            onPress={() => setMode('gps')}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.choiceIconText}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Dùng vị trí hiện tại</Text>
              <Text style={styles.choiceSubtitle}>Tự động lấy địa chỉ thông qua GPS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.choiceCard, shadow]}
            onPress={() => setMode('manual')}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: colors.accent }]}>
              <Text style={styles.choiceIconText}>✏️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Nhập địa chỉ</Text>
              <Text style={styles.choiceSubtitle}>Gõ tay nếu không muốn bật định vị</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'gps' && (
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardDescription}>
            App sẽ lấy vị trí hiện tại của bạn qua GPS.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUseGPS}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Lấy vị trí ngay</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)} style={styles.backRow}>
            <Text style={styles.backText}>← Chọn cách khác</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'manual' && (
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardDescription}>
            Nhập địa chỉ cụ thể (số nhà, tên đường) để có kết quả chính xác nhất.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 25 Trần Duy Hưng, Cầu Giấy, Hà Nội"
            placeholderTextColor={colors.textSecondary}
            value={addressText}
            onChangeText={setAddressText}
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmitAddress}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Tìm địa chỉ</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)} style={styles.backRow}>
            <Text style={styles.backText}>← Chọn cách khác</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
  cardDescription: {
    ...typography.subtitle,
    marginBottom: spacing.md,
    textAlign: 'center',
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
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  pinBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pinBadgeIcon: {
    fontSize: 26,
  },
  confirmLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  confirmAddress: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ghostButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ghostButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});