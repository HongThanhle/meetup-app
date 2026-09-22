import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

import LoginScreen from '../screens/LoginScreen';
import GroupCreateJoinScreen from '../screens/GroupCreateJoinScreen';
import GroupStatusScreen from '../screens/GroupStatusScreen';
import LocationInputScreen from '../screens/LocationInputScreen';
import SuggestionScreen from '../screens/SuggestionScreen';

const Stack = createNativeStackNavigator();

// Style header dùng chung cho mọi màn hình có thanh tiêu đề — đồng bộ với theme của ứng dụng
const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {token === null ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
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