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

export default function GroupCreateJoinScreen({ navigation }) {
  const { token, logout } = useAuth();
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
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
      // Chuyển sang màn hình trạng thái nhóm, mang theo groupId + inviteCode để hiện cho user
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
      <Text style={styles.title}>Nhóm hẹn gặp</Text>

      {mode === null && (
        <View style={{ gap: 16 }}>
          <TouchableOpacity style={styles.choiceButton} onPress={() => setMode('create')}>
            <Text style={styles.choiceButtonText}>➕ Tạo nhóm mới</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choiceButton} onPress={() => setMode('join')}>
            <Text style={styles.choiceButtonText}>🔑 Tham gia bằng mã mời</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'create' && (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Tên nhóm (ví dụ: Cà phê thứ 7)"
            value={groupName}
            onChangeText={setGroupName}
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Tạo nhóm</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.backLink}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'join' && (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã mời (ví dụ: ABC123)"
            value={inviteCodeInput}
            onChangeText={setInviteCodeInput}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleJoin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Tham gia</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.backLink}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

      <TouchableOpacity onPress={logout} style={{ marginTop: 32 }}>
        <Text style={styles.logoutLink}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  choiceButton: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  backLink: {
    textAlign: 'center',
    color: '#2563eb',
    marginTop: 4,
  },
  logoutLink: {
    textAlign: 'center',
    color: '#999',
  },
});
