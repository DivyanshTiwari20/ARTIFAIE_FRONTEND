import NotificationCard from '@/components/notification/NotificationCard';
import { normalizeNotificationsList } from '@/lib/notifications';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/api';
import { Notification, NotificationFilter } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
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
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications();
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

  const handleNotificationPress = async (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    await markNotificationRead(id);
    Alert.alert('Notification', 'Task details coming soon!');
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    await markNotificationRead(id);
  };

  const handleMarkAllAsRead = async () => {
    const filtered = filterNotifications();
    setNotifications(notifications.map(n => 
      filtered.find(f => f.id === n.id) ? { ...n, isRead: true } : n
    ));
    await markAllNotificationsRead();
    Alert.alert('Success', 'All notifications marked as read');
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

      {/* Notifications List */}
      <ScrollView 
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading notifications...</Text>
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
              You're all caught up for this period
            </Text>
          </View>
        )}
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
    color: '#000000 ',
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
  },
});