import { Stack } from "expo-router";
import { InventoryProvider } from "./context/InventoryContext"; // ✅ corrected path

export default function RootLayout() {
  return (
    <InventoryProvider>
      <Stack>
        {/* Tabs (main navigation) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Modal (if you’ll use it later) */}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />

        {/* Standalone pages */}
        <Stack.Screen
          name="add-item"
          options={{
            title: "Add New Item",
            headerShown: true,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="deduct-item"
          options={{
            title: "Deduct Item",
            headerShown: true,
            headerBackTitleVisible: false,
          }}
        />
      </Stack>
    </InventoryProvider>
  );
}
