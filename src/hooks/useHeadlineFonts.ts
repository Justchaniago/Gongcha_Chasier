// Custom hook to load headline fonts
import { useFonts as usePlayfairFonts } from '@expo-google-fonts/playfair-display';
import { useFonts as useMontserratFonts } from '@expo-google-fonts/montserrat';
import { useFonts as useBebasNeueFonts } from '@expo-google-fonts/bebas-neue';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

export function usePlayfairDisplay() {
  const [fontsLoaded] = usePlayfairFonts({
    PlayfairDisplay_700Bold,
  });
  return fontsLoaded;
}

export function useMontserrat() {
  const [fontsLoaded] = useMontserratFonts({
    Montserrat_700Bold,
  });
  return fontsLoaded;
}

export function useBebasNeue() {
  const [fontsLoaded] = useBebasNeueFonts({
    BebasNeue_400Regular,
  });
  return fontsLoaded;
}
