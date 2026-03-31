import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="invoices" options={{ headerShown: false }} />
          <Stack.Screen name="client-detail" options={{ headerShown: false }} />
          <Stack.Screen name="employee-detail" options={{ headerShown: false }} />
          <Stack.Screen name="assign-task" options={{ title: 'Assign Task' }} />
          <Stack.Screen name="create-task" options={{ title: 'Create Task' }} />
          <Stack.Screen name="create-client" options={{ title: 'Create Client' }} />
          <Stack.Screen name="employee-list" options={{ title: 'Employees' }} />
        </Stack>
      </AuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
