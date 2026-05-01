import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { createTaskUpdate, getTaskDetail, updateTaskStatus } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TaskUpdateItem = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  status: string;
  previousStatus: string;
  createdAt: string;
};

type TaskDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedBy: string;
  assignedByName: string;
  clientName: string;
  dueDate: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  updates: TaskUpdateItem[];
};

const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'completed':
      return { bg: '#DCFCE7', text: '#166534', label: 'Completed', icon: 'checkmark-circle' as const };
    case 'in_progress':
      return { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress', icon: 'play-circle' as const };
    case 'cancelled':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled', icon: 'close-circle' as const };
    default:
      return { bg: '#F3F4F6', text: '#374151', label: 'Pending', icon: 'time' as const };
  }
};

const getPriorityConfig = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Urgent' };
    case 'high':
      return { bg: '#FFEDD5', text: '#C2410C', label: 'High' };
    case 'low':
      return { bg: '#DCFCE7', text: '#166534', label: 'Low' };
    default:
      return { bg: '#FEF3C7', text: '#92400E', label: 'Medium' };
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeAgo = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(value);
};

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = params.taskId || '';
  const { user } = useAuth();
  const canManage = isAdminOrManager(user?.role);

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateSubTitle, setUpdateSubTitle] = useState('');
  const [updateSubDescription, setUpdateSubDescription] = useState('');
  const [updateStatus, setUpdateStatus] = useState<string>('pending');
  const [isSaving, setIsSaving] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setError('No task ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await getTaskDetail(taskId);
      if (res.success && res.data) {
        setTask(res.data as TaskDetail);
      } else {
        setError(res.message || 'Failed to load task');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load task');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const openUpdateModal = () => {
    setUpdateSubTitle('');
    setUpdateSubDescription('');
    setUpdateStatus(task?.status || 'pending');
    setShowUpdateModal(true);
  };

  const handleSaveUpdate = async () => {
    if (!updateSubTitle.trim()) {
      Alert.alert('Validation', 'Please enter what you are working on');
      return;
    }

    // Optimistically update local state and close modal
    if (task) {
      setTask({ ...task, status: updateStatus });
    }
    setShowUpdateModal(false);

    try {
      const res = await createTaskUpdate(taskId, {
        title: updateSubTitle.trim(),
        description: updateSubDescription.trim() || undefined,
        status: updateStatus,
      });

      if (res.success) {
        fetchTask(); // fetch in background to get new updates list
      } else {
        Alert.alert('Error', res.message || 'Failed to save update');
        fetchTask(); // revert
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save update');
      fetchTask(); // revert
    }
  };

  const handleQuickStatus = async (newStatus: string) => {
    try {
      const res = await updateTaskStatus(taskId, newStatus, `Status changed to ${newStatus}`);
      if (res.success) {
        await fetchTask();
      } else {
        Alert.alert('Error', res.message || 'Failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Task Detail</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Task Detail</Text>
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error || 'Task not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTask}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const updates = task.updates || [];

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Task Detail</Text>
        <TouchableOpacity onPress={fetchTask} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Task Header Card */}
        <View style={styles.taskHeaderCard}>
          <View style={styles.taskHeaderTop}>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={14} color={statusConfig.text} />
              <Text style={[styles.statusPillText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
            </View>
            <View style={[styles.priorityPill, { backgroundColor: priorityConfig.bg }]}>
              <Text style={[styles.priorityPillText, { color: priorityConfig.text }]}>{priorityConfig.label}</Text>
            </View>
          </View>

          <Text style={styles.taskTitleMain}>{task.title}</Text>
          {!!task.description && (
            <Text style={styles.taskDescMain}>{task.description}</Text>
          )}

          <View style={styles.taskMetaGrid}>
            <View style={styles.taskMetaItem}>
              <Ionicons name="person-outline" size={15} color="#6B7280" />
              <View>
                <Text style={styles.metaLabel}>Assigned To</Text>
                <Text style={styles.metaValue}>{task.assignedToName || '-'}</Text>
              </View>
            </View>
            <View style={styles.taskMetaItem}>
              <Ionicons name="person-circle-outline" size={15} color="#6B7280" />
              <View>
                <Text style={styles.metaLabel}>Assigned By</Text>
                <Text style={styles.metaValue}>{task.assignedByName || '-'}</Text>
              </View>
            </View>
            {!!task.clientName && (
              <View style={styles.taskMetaItem}>
                <Ionicons name="briefcase-outline" size={15} color="#6B7280" />
                <View>
                  <Text style={styles.metaLabel}>Client</Text>
                  <Text style={styles.metaValue}>{task.clientName}</Text>
                </View>
              </View>
            )}
            {!!task.category && (
              <View style={styles.taskMetaItem}>
                <Ionicons name="folder-outline" size={15} color="#6B7280" />
                <View>
                  <Text style={styles.metaLabel}>Category</Text>
                  <Text style={styles.metaValue}>{task.category}</Text>
                </View>
              </View>
            )}
            <View style={styles.taskMetaItem}>
              <Ionicons name="calendar-outline" size={15} color="#6B7280" />
              <View>
                <Text style={styles.metaLabel}>Due Date</Text>
                <Text style={styles.metaValue}>{formatDate(task.dueDate)}</Text>
              </View>
            </View>
            <View style={styles.taskMetaItem}>
              <Ionicons name="time-outline" size={15} color="#6B7280" />
              <View>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>{formatDate(task.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Update Status Button */}
        <TouchableOpacity style={styles.addUpdateBtn} onPress={openUpdateModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.addUpdateBtnText}>Add Status Update</Text>
        </TouchableOpacity>

        {/* Activity Timeline */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Ionicons name="time-outline" size={18} color="#111827" />
            <Text style={styles.timelineTitle}>Activity Timeline</Text>
            <View style={styles.timelineCountBadge}>
              <Text style={styles.timelineCountText}>{updates.length}</Text>
            </View>
          </View>

          {updates.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyTimelineText}>No updates yet</Text>
              <Text style={styles.emptyTimelineSubtext}>Status updates and activity will appear here</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {updates.map((update, index) => {
                const updateStatusConfig = getStatusConfig(update.status);
                const isLast = index === updates.length - 1;
                return (
                  <View key={update.id} style={styles.timelineItem}>
                    {/* Timeline line + dot */}
                    <View style={styles.timelineLine}>
                      <View style={[styles.timelineDot, { backgroundColor: updateStatusConfig.text }]} />
                      {!isLast && <View style={styles.timelineConnector} />}
                    </View>

                    {/* Content */}
                    <View style={[styles.timelineContent, isLast && { marginBottom: 0 }]}>
                      <View style={styles.timelineContentHeader}>
                        <View style={[styles.timelineStatusPill, { backgroundColor: updateStatusConfig.bg }]}>
                          <Text style={[styles.timelineStatusText, { color: updateStatusConfig.text }]}>
                            {updateStatusConfig.label}
                          </Text>
                        </View>
                        <Text style={styles.timelineTime}>{getTimeAgo(update.createdAt)}</Text>
                      </View>

                      {!!update.title && (
                        <Text style={styles.timelineUpdateTitle}>{update.title}</Text>
                      )}
                      {!!update.description && (
                        <Text style={styles.timelineUpdateDesc}>{update.description}</Text>
                      )}

                      <View style={styles.timelineFooter}>
                        <Ionicons name="person-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.timelineAuthor}>{update.userName}</Text>
                        <Text style={styles.timelineDateFull}>{formatDateTime(update.createdAt)}</Text>
                      </View>

                      {!!update.previousStatus && update.previousStatus !== update.status && (
                        <View style={styles.statusChangeRow}>
                          <View style={[styles.miniPill, { backgroundColor: getStatusConfig(update.previousStatus).bg }]}>
                            <Text style={[styles.miniPillText, { color: getStatusConfig(update.previousStatus).text }]}>
                              {getStatusConfig(update.previousStatus).label}
                            </Text>
                          </View>
                          <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
                          <View style={[styles.miniPill, { backgroundColor: updateStatusConfig.bg }]}>
                            <Text style={[styles.miniPillText, { color: updateStatusConfig.text }]}>
                              {updateStatusConfig.label}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Status Update Full Screen Page */}
      <Modal visible={showUpdateModal} animationType="slide" transparent={false} onRequestClose={() => setShowUpdateModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F4F6F8' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Top Bar */}
          <View style={styles.updatePageTopBar}>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Add Status Update</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.updatePageContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.updatePageTaskInfo}>
              <Ionicons name="document-text-outline" size={16} color="#6B7280" />
              <Text style={styles.modalTaskName} numberOfLines={1}>{task.title}</Text>
            </View>

            <Text style={styles.modalLabel}>What are you working on? <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Filling the taxation forms"
              value={updateSubTitle}
              onChangeText={setUpdateSubTitle}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Details (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              multiline
              placeholder="Any additional details about your progress..."
              value={updateSubDescription}
              onChangeText={setUpdateSubDescription}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusChipsRow}>
              {[
                { label: 'Pending', value: 'pending', color: '#6B7280', bg: '#F3F4F6' },
                { label: 'In Progress', value: 'in_progress', color: '#1D4ED8', bg: '#DBEAFE' },
                { label: 'Completed', value: 'completed', color: '#166534', bg: '#DCFCE7' },
                { label: 'Cancelled', value: 'cancelled', color: '#991B1B', bg: '#FEE2E2' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    updateStatus === option.value && { backgroundColor: option.bg, borderColor: option.color },
                  ]}
                  onPress={() => setUpdateStatus(option.value)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      updateStatus === option.value && { color: option.color, fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveUpdate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Update</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Extra bottom spacing so content isn't hidden behind keyboard */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    marginRight: 12,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },
  refreshBtn: {
    padding: 6,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  // Task Header Card
  taskHeaderCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 18,
  },
  taskHeaderTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTitleMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 28,
  },
  taskDescMain: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  taskMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '46%',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 1,
  },
  // Add Update Button
  addUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 14,
  },
  addUpdateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Activity Timeline
  timelineCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 18,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timelineTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  timelineCountBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timelineCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTimelineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyTimelineSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  timeline: {
    paddingLeft: 2,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLine: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  timelineContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timelineStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timelineUpdateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  timelineUpdateDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 6,
  },
  timelineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timelineAuthor: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  timelineDateFull: {
    fontSize: 11,
    color: '#D1D5DB',
    marginLeft: 'auto',
  },
  statusChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  miniPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Update Page (Full Screen)
  updatePageTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  updatePageContent: {
    padding: 18,
    paddingBottom: 40,
  },
  updatePageTaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTaskName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  modalLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    fontSize: 14,
    color: '#111827',
  },
  modalTextarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  modalSaveBtn: {
    backgroundColor: '#000000',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
