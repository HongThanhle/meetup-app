import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import GroupCreateJoinScreen from '../screens/GroupCreateJoinScreen';
import GroupStatusScreen from '../screens/GroupStatusScreen';
import LocationInputScreen from '../screens/LocationInputScreen';
import SuggestionScreen from '../screens/SuggestionScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { token, loading } = useAuth();

  // Đang đọc token đã lưu từ trước, chưa biết đăng nhập hay chưa -> hiện loading
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {token === null ? (
          // Chưa đăng nhập -> chỉ có màn hình Login
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Đã đăng nhập -> vào thẳng luồng nhóm
          <>
            <Stack.Screen
              name="GroupCreateJoin"
              component={GroupCreateJoinScreen}
              options={{ title: 'Nhóm hẹn gặp', headerShown: false }}
            />
            <Stack.Screen
              name="GroupStatus"
              component={GroupStatusScreen}
              options={{ title: 'Trạng thái nhóm' }}
            />
            <Stack.Screen
              name="LocationInput"
              component={LocationInputScreen}
              options={{ title: 'Chia sẻ vị trí' }}
            />
            <Stack.Screen
              name="Suggestion"
              component={SuggestionScreen}
              options={{ title: 'Gợi ý điểm hẹn' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
