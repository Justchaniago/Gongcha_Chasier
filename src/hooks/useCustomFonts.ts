// This file loads custom fonts for Expo and React Native
import { useFonts } from 'expo-font';

export default function useCustomFonts() {
  const [fontsLoaded] = useFonts({
    Coolvetica: require('../../assets/fonts/Coolvetica Hv Comp.otf'),
  });
  return fontsLoaded;
}
