import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getTasks, deleteTask, updateTask, onGlobalRefresh } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

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

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function PendingTasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState('pending');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const unsubscribe = onGlobalRefresh(() => {
      fetchPendingTasks(true);
    });

    return () => unsubscribe();
  }, [fetchPendingTasks]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPendingTasks(true);
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const lowerQ = searchQuery.toLowerCase();
    return tasks.filter((t) => 
      t.title?.toLowerCase().includes(lowerQ) ||
      t.description?.toLowerCase().includes(lowerQ) ||
      t.clientName?.toLowerCase().includes(lowerQ) ||
      t.assignedToName?.toLowerCase().includes(lowerQ)
    );
  }, [tasks, searchQuery]);

  // Edit logic
  const openEditModal = (task: any) => {
    setEditingTaskId(String(task.id || task._id));
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskStatus(task.status || 'pending');
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Validation', 'Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTaskId) {
        const res = await updateTask(editingTaskId, {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          status: taskStatus,
        });
        if (!res.success) {
          Alert.alert('Error', res.message || 'Failed to update task');
          return;
        }
      }

      setShowTaskModal(false);
      await fetchPendingTasks(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete logic
  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteTask(taskId);
              if (res.success) {
                setTasks((prev) => prev.filter((t) => (t.id || t._id) !== taskId));
              } else {
                Alert.alert('Error', res.message || 'Failed to delete task');
              }
            } catch (e: any) {
              Alert.alert('Error', 'Failed to connect to the server');
            }
          },
        },
      ]
    );
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pending tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
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
        ) : filteredTasks.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>There are no pending tasks right now.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.countText}>Showing {filteredTasks.length} pending task{filteredTasks.length !== 1 ? 's' : ''}</Text>
            {filteredTasks.map((task) => {
              const taskId = task.id || task._id;
              const badge = statusBadge(task.status);
              
              return (
                <View key={taskId} style={styles.taskCard}>
                  <TouchableOpacity
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
                  
                  {/* Edit and Delete Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => openEditModal(task)}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#4B5563" />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: '#F3F4F6' }]}
                      onPress={() => handleDeleteTask(taskId)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Task Modal */}
      <Modal visible={showTaskModal} animationType="slide" transparent onRequestClose={() => setShowTaskModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput style={styles.modalInput} placeholder="Task title" value={taskTitle} onChangeText={setTaskTitle} />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Task description"
              multiline
              value={taskDescription}
              onChangeText={setTaskDescription}
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.modalPickerWrap}>
              <Picker selectedValue={taskStatus} onValueChange={(val) => setTaskStatus(val)}>
                {statusOptions.map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} color="#111827" />
                ))}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowTaskModal(false)} disabled={isSubmitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveTask} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 16,
    paddingBottom: 0,
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
    paddingHorizontal: 16,
  },
  taskMeta: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  modalTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalPickerWrap: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    backgroundColor: '#111827',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
