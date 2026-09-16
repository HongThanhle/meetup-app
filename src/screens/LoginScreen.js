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
import { login as apiLogin, register as apiRegister } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim() || (isRegisterMode && !name.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ.');
      return;
    }

    setLoading(true);
    try {
      const result = isRegisterMode
        ? await apiRegister({ name, email, password })
        : await apiLogin({ email, password });

      // login() ở AuthContext sẽ lưu token, tự động chuyển màn hình
      // nhờ AppNavigator theo dõi trạng thái đăng nhập
      await login(result.token, result.user);
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập'}
      </Text>

      {isRegisterMode && (
        <TextInput
          style={styles.input}
          placeholder="Tên của bạn"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
        <Text style={styles.switchLink}>
          {isRegisterMode
            ? 'Đã có tài khoản? Đăng nhập'
            : 'Chưa có tài khoản? Đăng ký'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  switchLink: {
    textAlign: 'center',
    color: '#2563eb',
    marginTop: 16,
  },
});
