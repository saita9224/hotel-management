// hooks/useTheme.js

import { useColorScheme } from "react-native";
import { Colors, Fonts } from "../constants/theme";

export const useTheme = () => {
  const scheme = useColorScheme() || "light";

  return {
    colors: Colors[scheme],
    fonts: Fonts,
    scheme,
  };
};