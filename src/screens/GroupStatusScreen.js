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
import { getGroupStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 4000; // gọi lại API mỗi 4 giây để cập nhật danh sách

export default function GroupStatusScreen({ route, navigation }) {
  const { groupId, groupName, inviteCode } = route.params;
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getGroupStatus(token, groupId);
      setMembers(result.members);
    } catch (err) {
      // Lỗi mạng tạm thời khi poll thì bỏ qua, không làm phiền user bằng Alert liên tục
      console.log('Lỗi lấy trạng thái nhóm:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  // Polling: tự động gọi lại API mỗi vài giây khi màn hình đang mở
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  const submittedCount = members.filter((m) => m.hasSubmitted).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{groupName}</Text>

      {inviteCode && (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Mã mời — gửi cho bạn bè:</Text>
          <Text style={styles.codeValue}>{inviteCode}</Text>
        </View>
      )}

      <Text style={styles.progressText}>
        {submittedCount}/{members.length} người đã gửi vị trí
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.userId}
          style={{ marginTop: 16 }}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={item.hasSubmitted ? styles.statusDone : styles.statusPending}>
                {item.hasSubmitted ? '✓ Đã gửi' : 'Đang chờ...'}
              </Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => navigation.navigate('LocationInput', { groupId })}
      >
        <Text style={styles.buttonText}>Chia sẻ vị trí của tôi</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate('Suggestion', { groupId })}
      >
        <Text style={styles.buttonText}>Xem gợi ý điểm hẹn</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
  },
  codeBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 13,
    color: '#666',
  },
  codeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: '#555',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberName: {
    fontSize: 15,
  },
  statusDone: {
    color: '#16a34a',
    fontWeight: '600',
  },
  statusPending: {
    color: '#999',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
