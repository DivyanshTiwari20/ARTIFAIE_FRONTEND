import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { clearAuth, deleteAccountApi, getSavedUser, loginApi, saveUser, updatePushToken } from '../services/api';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Incremented every time a push notification arrives — screens can react to this */
  notificationRefreshKey: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
  const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  /** Register for push notifications — fully silent if it fails */
  const registerForPushNotificationsAsync = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default', // explicit sound to ensure android rings
        });
      }

      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        console.log('No EAS projectId found — cannot register push token');
        return;
      }

      const tokenInfo = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenInfo.data;
      console.log('📲 Expo push token obtained:', token?.slice(0, 35) + '...');
      if (token) {
        // Fire-and-forget: don't let a 401 crash the app
        updatePushToken(token)
          .then(() => console.log('✅ Push token saved to server'))
          .catch((e: any) =>
            console.log('Push token save skipped:', e?.message ?? e)
          );
      }
    } catch (e: any) {
      // Fully swallow — push is optional, never block the user
      console.log('Push registration skipped:', e?.message ?? e);
    }
  };

  // Set up notification listeners
  useEffect(() => {
    // Listener for when a notification is RECEIVED while app is in foreground
    notificationReceivedListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notification received in foreground:', notification.request.content.title);
        // Bump the refresh key so notification screens re-fetch
        setNotificationRefreshKey((prev) => prev + 1);
      }
    );

    // Listener for when user TAPS a notification (foreground or background)
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response.notification.request.content.title);
        const data = response.notification.request.content.data;
        // Bump refresh key
        setNotificationRefreshKey((prev) => prev + 1);

        // Navigate to relevant screen if there's a related task
        // Navigation will be handled by consuming components via the refresh key
      }
    );

    // Also re-register push token when app comes back from background
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Bump refresh to pick up any notifications that arrived while backgrounded
        setNotificationRefreshKey((prev) => prev + 1);
      }
    });

    return () => {
      if (notificationReceivedListener.current) {
        Notifications.removeNotificationSubscription(notificationReceivedListener.current);
      }
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
      subscription.remove();
    };
  }, []);

  // On app start, check if we have a saved user session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedUser = await getSavedUser();
        if (savedUser) {
          setUser(savedUser);
          
          // Ensure Push token is picked up if it was refreshed between app launches
          registerForPushNotificationsAsync();
        }
      } catch (error) {
        console.log('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginApi(email, password);

      if (response.success && response.data) {
        const userData: User = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
        };
        setUser(userData);

        // Register push token AFTER a confirmed fresh login (token is definitely valid now)
        registerForPushNotificationsAsync();

        return { success: true };
      }

      return { success: false, message: response.message || 'Login failed' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error. Is the backend running?',
      };
    }
  };

  const logout = async () => {
    await clearAuth();
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      const response = await deleteAccountApi();
      if (response.success) {
        await clearAuth();
        setUser(null);
        return { success: true };
      }
      return {
        success: false,
        message: response.message || 'Could not delete account',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Could not delete account',
      };
    }
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, deleteAccount, isAuthenticated, isLoading, notificationRefreshKey }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}