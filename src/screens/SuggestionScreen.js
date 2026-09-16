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

export default function SuggestionScreen({ route }) {
  const { groupId } = route.params;
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSuggestions(token, groupId);
      setData(result);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không lấy được gợi ý. Có thể chưa đủ người gửi vị trí.');
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

      {loading && <ActivityIndicator style={{ marginTop: 24 }} size="large" />}

      {!loading && data && (
        <>
          <Text style={styles.centroidText}>
            Điểm trung tâm: {data.centroid.lat.toFixed(5)}, {data.centroid.lng.toFixed(5)}
          </Text>

          <FlatList
            data={data.suggestions}
            keyExtractor={(item) => String(item.id)}
            style={{ marginTop: 16 }}
            renderItem={({ item, index }) => (
              <View style={styles.placeRow}>
                <Text style={styles.placeName}>
                  {index + 1}. {item.name}
                </Text>
                <Text style={styles.placeDistance}>{item.distance.toFixed(2)} km</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Chưa tìm được quán nào gần đó.</Text>
            }
          />
        </>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={fetchSuggestions}>
        <Text style={styles.refreshText}>Làm mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  centroidText: { textAlign: 'center', marginTop: 12, color: '#666', fontSize: 13 },
  placeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  placeName: { fontSize: 15, flex: 1 },
  placeDistance: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 24 },
  refreshButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    alignItems: 'center',
  },
  refreshText: { color: '#2563eb', fontWeight: '600' },
});
