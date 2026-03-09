// hooks/useTheme.js

import { useColorScheme } from "react-native";
import { Colors } from "../theme/colors";

export const useTheme = () => {
  const scheme = useColorScheme() || "light";
  return {
    colors: Colors[scheme],
    scheme,
  };
};