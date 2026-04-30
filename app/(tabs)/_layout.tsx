import FloatingActionButton from '@/components/common/FloatingActionButton';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager, isEmployeeRole } from '@/lib/roles';
import { prefetchEssentialAppData } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isEmployee = isEmployeeRole(user?.role);
  const canUseFab = isAdminOrManager(user?.role);

  useEffect(() => {
    void prefetchEssentialAppData(user?.role);
  }, [user?.role]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            height: 58 + Math.max(insets.bottom, 8),
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notification"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="list"
          options={{
            title: 'List',
            href: isEmployee ? null : '/list',
            tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tally"
          options={{
            title: 'Tally Data',
            href: user?.role === 'admin' ? '/tally' : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
          }}
        />
      </Tabs>
      {canUseFab && <FloatingActionButton />}
    </View>
  );
}
