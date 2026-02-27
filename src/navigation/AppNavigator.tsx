import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useStaffAuth } from '../context/StaffAuthContext';
import { COLORS } from '../theme/colorTokens'; // ✅ Import Colors Statis

// Components
import CustomTabBar from '../components/CustomTabBar';
import CashierDashboard from '../screens/CashierDashboard';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';         
import HistoryScreen from '../screens/HistoryScreen';     
import ScannerScreen from '../screens/ScannerScreen';     
import RewardsScreen from '../screens/RewardsScreen';     
import ProfileScreen from '../screens/ProfileScreen';     

export type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  History: undefined;
  Scan: undefined;
  Rewards: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function MainTabNavigator() {
  return <CashierDashboard />;
}

export default function AppNavigator() {
  const { staff, loading } = useStaffAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.primary }}>
        <ActivityIndicator size="large" color={COLORS.brand.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {staff ? (
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}