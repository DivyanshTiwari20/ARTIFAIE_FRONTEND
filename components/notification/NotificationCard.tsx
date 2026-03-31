import { Notification } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NotificationCardProps {
  notification: Notification;
  onPress: (id: string, relatedTaskId?: string) => void;
  onMarkAsRead?: (id: string) => void;
}

export default function NotificationCard({ 
  notification, 
  onPress,
  onMarkAsRead 
}: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'task':
        return 'checkmark-circle';
      case 'announcement':
        return 'megaphone';
      case 'reminder':
        return 'time';
      case 'alert':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'task':
        return '#34C759';
      case 'announcement':
        return '#007AFF';
      case 'reminder':
        return '#FF9500';
      case 'alert':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[styles.card, !notification.isRead && styles.unreadCard]}
      onPress={() => onPress(notification.id, notification.relatedTaskId)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
        <Ionicons name={getIcon()} size={24} color={getIconColor()} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title ?? 'Notification'}
          </Text>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.message} numberOfLines={2}>
          {notification.message ?? ''}
        </Text>
        
        <Text style={styles.time}>{getTimeAgo(notification.createdAt ?? '')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    unreadCard: {
    //   backgroundColor: '#FFFFFF',
    //   borderLeftWidth: 4,
    //   borderLeftColor: '#6B4EFF',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    content: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF3B30',
      marginLeft: 8,
    },
    message: {
      fontSize: 14,
      color: '#666666',
      lineHeight: 20,
      marginBottom: 8,
    },
    time: {
      fontSize: 12,
      color: '#999999',
      fontWeight: '500',
    },
  });