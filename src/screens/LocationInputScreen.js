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
} from '../services/api';
import { useAuth } from '../context/AuthContext';

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

      await submitGPSLocation(token, {
        groupId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      Alert.alert('Thành công', 'Đã chia sẻ vị trí!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
      setConfirmData(result);
    } catch (err) {
      Alert.alert('Không tìm được địa chỉ', 'Thử nhập địa chỉ cụ thể hơn.');
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
      await confirmManualLocation(token, {
        groupId,
        lat: confirmData.lat,
        lng: confirmData.lng,
        address: addressText,
      });
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
        <Text style={styles.title}>Xác nhận địa chỉ</Text>
        <Text style={styles.confirmText}>
          Bạn có ý là: {'\n'}
          <Text style={styles.bold}>{confirmData.matchedAddress}</Text>?
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => handleConfirmAddress(true)}
          >
            <Text style={styles.buttonText}>Đúng, xác nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => handleConfirmAddress(false)}
          >
            <Text style={styles.buttonText}>Sửa lại</Text>
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Chia sẻ vị trí của bạn</Text>

      {mode === null && (
        <View style={{ gap: 16 }}>
          <TouchableOpacity style={styles.choiceButton} onPress={() => setMode('gps')}>
            <Text style={styles.choiceButtonText}>📍 Dùng vị trí hiện tại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choiceButton} onPress={() => setMode('manual')}>
            <Text style={styles.choiceButtonText}>✏️ Nhập địa chỉ</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'gps' && (
        <View>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleUseGPS}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Lấy vị trí ngay</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.backLink}>← Chọn cách khác</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'manual' && (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 25 Trần Duy Hưng, Cầu Giấy, Hà Nội"
            value={addressText}
            onChangeText={setAddressText}
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSubmitAddress}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Tìm địa chỉ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.backLink}>← Chọn cách khác</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} size="large" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  choiceButton: { padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  choiceButtonText: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  primaryButton: { backgroundColor: '#2563eb' },
  cancelButton: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  backLink: { textAlign: 'center', color: '#2563eb', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  confirmText: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  bold: { fontWeight: 'bold' },
});
