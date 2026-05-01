import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="invoices" options={{ headerShown: false }} />
            <Stack.Screen name="client-detail" options={{ headerShown: false }} />
            <Stack.Screen name="employee-detail" options={{ headerShown: false }} />
            <Stack.Screen name="assign-task" options={{ headerShown: false }} />
            <Stack.Screen name="create-task" options={{ headerShown: false }} />
            <Stack.Screen name="pending-tasks" options={{ headerShown: false }} />
            <Stack.Screen name="task-detail" options={{ headerShown: false }} />
            <Stack.Screen name="create-client" options={{ headerShown: false }} />
            <Stack.Screen name="employee-list" options={{ headerShown: false }} />
            <Stack.Screen name="update-password" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
            <Stack.Screen name="help-support" options={{ headerShown: false }} />
            <Stack.Screen name="faq" options={{ headerShown: false }} />
            <Stack.Screen name="about" options={{ headerShown: false }} />
            <Stack.Screen name="active-devices" options={{ headerShown: false }} />
          </Stack>
        </View>
      </AuthProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
    </ThemeProvider>
  );
}
