import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-purple-500">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center bg-blue-500">
        <Text className="text-4xl font-bold text-white">Test</Text>
        <Text className="text-lg text-yellow-300 mt-4">NativeWind Web Test</Text>
      </View>
    </SafeAreaView>
  );
}
