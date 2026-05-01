import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getActiveSessions, logoutSession, getCurrentSessionToken } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SessionItem = {
  id: string;
  deviceName: string;
  platform: string;
  sessionToken: string;
  lastActive: string;
  createdAt: string;
};

export default function ActiveDevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getCurrentSessionToken();
      setCurrentSessionToken(token);
      
      const res = await getActiveSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      } else {
        Alert.alert('Error', res.message || 'Could not fetch active devices.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLogoutDevice = (sessionId: string, deviceName: string) => {
    Alert.alert(
      'Log out device',
      `Are you sure you want to log out from "${deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(sessionId);
              const res = await logoutSession(sessionId);
              if (res.success) {
                setSessions((prev) => prev.filter((s) => s.id !== sessionId));
              } else {
                Alert.alert('Error', res.message || 'Could not log out device.');
              }
            } catch (e: any) {
              Alert.alert('Error', 'Failed to log out device.');
            } finally {
              setIsLoggingOut(null);
            }
          },
        },
      ]
    );
  };

  const getPlatformIcon = (platformStr: string) => {
    const p = platformStr.toLowerCase();
    if (p.includes('ios')) return 'logo-apple';
    if (p.includes('android')) return 'logo-android';
    if (p.includes('web') || p.includes('windows') || p.includes('mac')) return 'desktop-outline';
    return 'phone-portrait-outline';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Devices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#4B5563" />
          <Text style={styles.infoText}>
            These are the devices currently logged into your account. You can log out of any unfamiliar devices here.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#111827" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No active devices found.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Currently Logged In ({sessions.length})</Text>
            
            {sessions.map((session) => {
              const isCurrentDevice = session.sessionToken === currentSessionToken;
              return (
                <View key={session.id} style={[styles.deviceCard, isCurrentDevice && styles.currentDeviceCard]}>
                  <View style={styles.deviceIconContainer}>
                    <Ionicons name={getPlatformIcon(session.platform) as any} size={28} color="#111827" />
                  </View>
                  
                  <View style={styles.deviceDetails}>
                    <View style={styles.deviceHeaderRow}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {session.deviceName}
                      </Text>
                      {isCurrentDevice && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>This Device</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.deviceMeta}>
                      Last active: {formatDate(session.lastActive)}
                    </Text>
                    <Text style={styles.deviceMeta}>
                      Logged in: {formatDate(session.createdAt)}
                    </Text>
                  </View>

                  {!isCurrentDevice && (
                    <TouchableOpacity 
                      style={styles.logoutBtn}
                      onPress={() => handleLogoutDevice(session.id, session.deviceName)}
                      disabled={isLoggingOut === session.id}
                    >
                      {isLoggingOut === session.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  centerContainer: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  currentDeviceCard: {
    borderColor: '#DBEAFE',
    backgroundColor: '#F0F9FF',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
    flexShrink: 1,
  },
  currentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  deviceMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
