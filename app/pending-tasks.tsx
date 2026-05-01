import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getTasks } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const statusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return { bg: '#DCFCE7', color: '#166534', text: 'Completed' };
    case 'in_progress':
      return { bg: '#DBEAFE', color: '#1D4ED8', text: 'In Progress' };
    case 'cancelled':
      return { bg: '#FEE2E2', color: '#991B1B', text: 'Cancelled' };
    default:
      return { bg: '#FEF08A', color: '#A16207', text: 'Pending' };
  }
};

export default function PendingTasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingTasks = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setIsLoading(true);
      setError(null);
      const res = await getTasks({ status: 'pending' }, { forceRefresh, staleWhileRevalidate: !forceRefresh });
      if (res.success) {
        // filter locally just in case
        const pending = (res.data || []).filter((t: any) => t.status === 'pending');
        setTasks(pending);
      } else {
        setError(res.message || 'Failed to load tasks');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTasks(false);
  }, [fetchPendingTasks]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPendingTasks(true);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Tasks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6B4EFF" />
            <Text style={styles.loadingText}>Loading pending tasks...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>There are no pending tasks right now.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.countText}>Showing {tasks.length} pending task{tasks.length !== 1 ? 's' : ''}</Text>
            {tasks.map((task) => {
              const taskId = task.id || task._id;
              const badge = statusBadge(task.status);
              
              return (
                <TouchableOpacity
                  key={taskId}
                  style={styles.taskCard}
                  onPress={() => router.push(`/task-detail?taskId=${taskId}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskCardTop}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskCardTopRight}>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {task.description || 'No description provided.'}
                  </Text>
                  
                  {!!task.clientName && (
                    <Text style={styles.taskMeta}>Client: {task.clientName}</Text>
                  )}
                  
                  {!!task.dueDate && (
                    <Text style={styles.taskMeta}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
                  )}
                  
                  {!!task.assignedToName && (
                    <View style={styles.assigneeContainer}>
                      <View style={styles.assigneeAvatar}>
                        <Text style={styles.assigneeInitials}>
                          {task.assignedToName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.assigneeName}>{task.assignedToName}</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
  listContainer: {
    padding: 20,
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskCardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 4,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8E4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  assigneeInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B4EFF',
  },
  assigneeName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
