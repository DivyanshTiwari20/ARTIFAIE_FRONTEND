import NotificationCard from '@/components/notification/NotificationCard';
import { NotificationListSkeleton } from '@/components/common/Skeleton';
import { normalizeNotificationsList } from '@/lib/notifications';
import { getNotifications, getTask, markAllNotificationsRead, markNotificationRead } from '@/services/api';
import { Notification, NotificationFilter } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const NOTIFICATION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function NotificationPage() {
  const { user, notificationRefreshKey } = useAuth();
  const router = useRouter();
  const showModeToggle = isAdminOrManager(user?.role);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('today');
  const [mode, setMode] = useState<'task' | 'general'>('task');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    try {
      setFetchError(null);
      const res = await getNotifications(showModeToggle ? mode : undefined, {
        forceRefresh: true,
        staleWhileRevalidate: false,
      });
      if (res && res.success) {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object'
            ? (raw as any).notifications ?? (raw as any).items ?? []
            : [];
        setNotifications(normalizeNotificationsList(list));
      } else {
        setNotifications([]);
      }
    } catch (error: any) {
      console.error('Failed to load notifications:', error?.message || 'Unknown error');
      setFetchError(error?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [mode, showModeToggle, user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    fetchNotifications(true);
    const intervalId = setInterval(() => {
      fetchNotifications(true);
    }, NOTIFICATION_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications, user]);

  // Auto-refresh when a push notification arrives (via AuthContext)
  useEffect(() => {
    if (notificationRefreshKey > 0 && user) {
      fetchNotifications(true);
    }
  }, [notificationRefreshKey]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const filterNotifications = () => {
    const now = new Date();
    
    return notifications.filter((notification) => {
      const notificationDate = new Date(notification.createdAt);
      if (Number.isNaN(notificationDate.getTime())) {
        return false;
      }

      switch (selectedFilter) {
        case 'today':
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return notificationDate >= todayStart;
        
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return notificationDate >= weekAgo;
        
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return notificationDate >= monthAgo;
        
        case 'all':
        default:
          return true;
      }
    });
  };

  const handleNotificationPress = async (id: string, relatedTaskId?: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    try { await markNotificationRead(id); } catch {}

    if (relatedTaskId) {
      try {
        const taskRes = await getTask(relatedTaskId);
        if (taskRes.success && taskRes.data) {
          if (isAdminOrManager(user?.role)) {
            router.push(`/employee-detail?id=${taskRes.data.assignedTo}`);
          } else {
            router.push('/');
          }
          return;
        }
      } catch (err) {
        console.error('Failed to load related task', err);
      }
    }

    Alert.alert('Notification', 'Task details coming soon!');
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    try { await markNotificationRead(id); } catch {}
  };

  const handleMarkAllAsRead = async () => {
    const filtered = filterNotifications();
    setNotifications(notifications.map(n => 
      filtered.find(f => f.id === n.id) ? { ...n, isRead: true } : n
    ));
    try {
      await markAllNotificationsRead();
      Alert.alert('Success', 'All notifications marked as read');
    } catch {}
  };

  const filteredNotifications = filterNotifications();
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  const filters: { key: NotificationFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
        {filteredNotifications.length > 0 && unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllButtonText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainerWrap}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Mode Toggle for Admin/Manager */}
      {showModeToggle && (
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'task' && styles.modeTabActive]}
            onPress={() => setMode('task')}
          >
            <Text style={[styles.modeTabText, mode === 'task' && styles.modeTabTextActive]}>
              Task
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'general' && styles.modeTabActive]}
            onPress={() => setMode('general')}
          >
            <Text style={[styles.modeTabText, mode === 'general' && styles.modeTabTextActive]}>
              General
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView 
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !isRefreshing ? (
          <NotificationListSkeleton count={6} />
        ) : fetchError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
            <Text style={styles.emptyText}>Failed to load</Text>
            <Text style={styles.emptySubText}>{fetchError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={80}
              color="#CCCCCC"
            />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubText}>
              You&apos;re all caught up for this period
            </Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  unreadCount: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  markAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainerWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterTabActive: {
    backgroundColor: '#000000',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999999',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  modeTabTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
});




