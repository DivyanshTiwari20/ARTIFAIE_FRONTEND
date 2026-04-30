import Avatar from '@/components/common/Avatar';
import { TaskListSkeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrManager } from '@/lib/roles';
import { createTask, deleteTask, getTasks, updateTask, updateTaskStatus } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type EmployeeParams = {
  id?: string;
  name?: string;
  role?: string;
  avatar?: string;
};

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

type TaskItem = {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string | number;
  clientName?: string;
  dueDate?: string;
  updatedAt?: string;
  createdAt?: string;
};

const statusOptions: { label: string; value: TaskStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const menuOptions: { label: string; value: string; icon: string; iconColor: string }[] = [
  { label: 'Update Status', value: 'update_status', icon: 'create-outline', iconColor: '#2563EB' },
  { label: 'Mark Completed', value: 'completed', icon: 'checkmark-circle-outline', iconColor: '#16A34A' },
  { label: 'Mark Pending', value: 'pending', icon: 'time-outline', iconColor: '#6B7280' },
  { label: 'Mark Cancelled', value: 'cancelled', icon: 'close-circle-outline', iconColor: '#DC2626' },
];

const getStatusConfig = (status?: TaskStatus) => {
  switch (status) {
    case 'completed':
      return { bg: '#DCFCE7', text: '#166534', label: 'Completed' };
    case 'in_progress':
      return { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress' };
    case 'cancelled':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
    default:
      return { bg: '#FFEDD5', text: '#C2410C', label: 'Pending' };
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isTaskOverdue = (task: TaskItem) => {
  if (!task.dueDate) return false;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  return due < Date.now();
};

const getTaskCardTone = (task: TaskItem) => {
  if (isTaskOverdue(task)) {
    return { backgroundColor: '#FEECEC', borderColor: '#FECACA' };
  }

  switch (task.status) {
    case 'completed':
      return { backgroundColor: '#ECFDF3', borderColor: '#BBF7D0' };
    case 'in_progress':
      return { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' };
    case 'cancelled':
      return { backgroundColor: '#FEF2F2', borderColor: '#FECACA' };
    default:
      return { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' };
  }
};

function EmployeeProfileScreen() {
  const params = useLocalSearchParams<EmployeeParams>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const loggedInEmployeeId = useMemo(() => {
    return String((user as any)?.id || (user as any)?._id || '');
  }, [user]);

  const profileEmployeeId = String(params.id || loggedInEmployeeId || '');
  const isSelfProfile = !params.id || String(params.id) === loggedInEmployeeId;
  const canManageTasks = isAdminOrManager(user?.role);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEditingTask, setStatusEditingTask] = useState<TaskItem | null>(null);
  const [statusSubTitle, setStatusSubTitle] = useState('');
  const [statusSubDescription, setStatusSubDescription] = useState('');
  const [statusValue, setStatusValue] = useState<TaskStatus>('pending');
  const [isStatusSaving, setIsStatusSaving] = useState(false);

  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const profileName = String(params.name || user?.name || 'Employee');
  const profileRole = String(params.role || user?.role || 'Team Member');
  const profileAvatar = String(params.avatar || (user as any)?.profileImageUrl || (user as any)?.avatar || '');

  const fetchTasks = useCallback(async () => {
    if (!profileEmployeeId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await getTasks({}, { forceRefresh: true, staleWhileRevalidate: false });

      if (res?.success) {
        let nextTasks = Array.isArray(res.data)
          ? (res.data as TaskItem[])
          : ((res.data as any)?.tasks || []);

        if (!isSelfProfile) {
          nextTasks = nextTasks.filter(
            (task: TaskItem) => String((task as any).assignedTo ?? '') === String(profileEmployeeId)
          );
        }

        setTasks(nextTasks);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.log('Error fetching tasks', e);
    } finally {
      setIsLoading(false);
    }
  }, [isSelfProfile, profileEmployeeId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedTaskIds([]);
  }, []);

  const openCreateModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('pending');
    setShowTaskModal(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTaskId(String(task.id || task._id));
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskStatus(task.status || 'pending');
    setShowTaskModal(true);
    setOpenMenuTaskId(null);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Validation', 'Task title is required');
      return;
    }

    if (!profileEmployeeId) {
      Alert.alert('Error', 'Employee ID not found');
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
      } else {
        const res = await createTask({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          status: taskStatus,
          assignedTo: profileEmployeeId,
        });
        if (!res.success) {
          Alert.alert('Error', res.message || 'Failed to create task');
          return;
        }
      }

      setShowTaskModal(false);
      await fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTaskById = async (taskId: string) => {
    const res = await deleteTask(taskId);
    if (!res.success) {
      throw new Error(res.message || 'Failed to delete task');
    }
  };

  const handleDeleteTask = (task: TaskItem) => {
    const id = String(task.id || task._id || '');
    if (!id) return;

    Alert.alert('Delete Task', `Delete "${task.title || 'this task'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await handleDeleteTaskById(id);
            await fetchTasks();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedTaskIds.length === 0) return;

    Alert.alert('Delete Tasks', `Delete ${selectedTaskIds.length} selected task(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(selectedTaskIds.map((id) => handleDeleteTaskById(id)));
            exitSelectionMode();
            await fetchTasks();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to delete selected tasks');
          }
        },
      },
    ]);
  };

  const handleQuickStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    if (!newStatus) return;
    try {
      setOpenMenuTaskId(null);
      const res = await updateTaskStatus(taskId, newStatus);
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (String(t.id || t._id) === taskId ? { ...t, status: newStatus } : t))
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to update status');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status');
    }
  };

  const openEmployeeStatusModal = (task: TaskItem) => {
    setOpenMenuTaskId(null);
    setStatusEditingTask(task);
    setStatusSubTitle('');
    setStatusSubDescription('');
    setStatusValue(task.status || 'pending');
    setShowStatusModal(true);
  };

  const saveEmployeeStatusUpdate = async () => {
    if (!statusEditingTask) return;
    if (!statusSubTitle.trim()) {
      Alert.alert('Validation', 'Please enter what you are working on');
      return;
    }

    try {
      setIsStatusSaving(true);
      const taskId = String(statusEditingTask.id || statusEditingTask._id);
      const res = await updateTaskStatus(
        taskId,
        statusValue,
        statusSubTitle.trim(),
        statusSubDescription.trim() || undefined
      );

      if (!res.success) {
        Alert.alert('Error', res.message || 'Failed to update status');
        return;
      }

      setShowStatusModal(false);
      setStatusEditingTask(null);
      await fetchTasks();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status');
    } finally {
      setIsStatusSaving(false);
    }
  };

  const toggleMenu = (taskId: string) => {
    setOpenMenuTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        const next = prev.filter((id) => id !== taskId);
        if (next.length === 0) {
          setSelectionMode(false);
        }
        return next;
      }
      return [...prev, taskId];
    });
  };

  const handleTaskLongPress = (taskId: string) => {
    if (!canManageTasks) return;
    setSelectionMode(true);
    setOpenMenuTaskId(null);
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
  };

  const handleEditSelected = () => {
    if (selectedTaskIds.length !== 1) {
      Alert.alert('Edit Task', 'Please select exactly one task to edit.');
      return;
    }

    const selectedTask = tasks.find((task) => String(task.id || task._id) === selectedTaskIds[0]);
    if (!selectedTask) return;

    exitSelectionMode();
    openEditModal(selectedTask);
  };

  const activeCount = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = tasks.filter((t) => !t.status || t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const filterOptions: { label: string; value: 'all' | TaskStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks;
    return tasks.filter((task) => (task.status || 'pending') === taskFilter);
  }, [taskFilter, tasks]);

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => {
            if (selectionMode) {
              exitSelectionMode();
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>
          {selectionMode ? `${selectedTaskIds.length} Selected` : 'Employee Profile'}
        </Text>

        {selectionMode && canManageTasks ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.topActionBtn} onPress={handleEditSelected}>
              <Ionicons name="pencil-outline" size={18} color="#111827" />
              <Text style={styles.topActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.topActionBtn} onPress={handleDeleteSelected}>
              <Trash2 size={16} color="#DC2626" />
              <Text style={[styles.topActionText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Avatar name={profileName} size={70} imageUri={profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profileName}</Text>
            <Text style={styles.role}>{profileRole}</Text>
            <Text style={styles.userIdLabel}>ID: {profileEmployeeId || '-'}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Pending" value={String(pendingCount)} accent="#C2410C" />
          <SummaryCard label="Active" value={String(activeCount)} accent="#2563EB" />
          <SummaryCard label="Done" value={String(completedCount)} accent="#16A34A" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{isSelfProfile ? 'My Tasks' : 'Employee Tasks'}</Text>
            <TouchableOpacity onPress={() => fetchTasks()} style={styles.refreshChip}>
              <Ionicons name="refresh" size={14} color="#111827" />
              <Text style={styles.refreshChipText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.filterChip, taskFilter === option.value && styles.filterChipActive]}
                onPress={() => setTaskFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    taskFilter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <TaskListSkeleton count={4} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
              <Text style={styles.emptyText}>No tasks found for selected filter.</Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const taskId = String(task.id || task._id || '');
              const status = getStatusConfig(task.status);
              const cardTone = getTaskCardTone(task);
              const isMenuOpen = openMenuTaskId === taskId;
              const isSelected = selectedTaskIds.includes(taskId);

              return (
                <TouchableOpacity
                  key={taskId}
                  style={[styles.taskCard, cardTone, isSelected && styles.taskCardSelected]}
                  onLongPress={() => handleTaskLongPress(taskId)}
                  delayLongPress={3000}
                  onPress={() => {
                    if (selectionMode && canManageTasks) {
                      toggleTaskSelection(taskId);
                      return;
                    }
                    router.push(`/task-detail?taskId=${taskId}` as any);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.taskHeaderRow}>
                    <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>
                    <View style={styles.taskHeaderRight}>
                      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusPillText, { color: status.text }]}>{status.label}</Text>
                      </View>
                      {!selectionMode && (
                        <TouchableOpacity
                          style={styles.kebabButton}
                          onPress={() => toggleMenu(taskId)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={styles.taskDescription}>{task.description || 'No description provided.'}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Client: {task.clientName || '-'}</Text>
                    <Text style={[styles.metaText, isTaskOverdue(task) && styles.overdueText]}>
                      Due: {formatDate(task.dueDate)}
                    </Text>
                  </View>

                  {!canManageTasks && isMenuOpen && (
                    <View style={styles.menuDropdown}>
                      {menuOptions.map((option) => {
                        if (option.value === task.status) return null;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={styles.menuItem}
                            onPress={() => {
                              if (option.value === 'update_status') {
                                openEmployeeStatusModal(task);
                              } else {
                                handleQuickStatusUpdate(taskId, option.value as TaskStatus);
                              }
                            }}
                          >
                            <Ionicons name={option.icon as any} size={18} color={option.iconColor} />
                            <Text style={styles.menuItemText}>{option.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {canManageTasks && (
                    <>
                      <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Status</Text>
                        <View style={styles.statusPickerWrap}>
                          <Picker
                            selectedValue={task.status || 'pending'}
                            onValueChange={(val) => handleQuickStatusUpdate(taskId, val as TaskStatus)}
                            style={styles.statusPicker}
                            dropdownIconColor="#111827"
                          >
                            {statusOptions.map((option) => (
                              <Picker.Item key={option.value} label={option.label} value={option.value} color="#111827" />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      {isMenuOpen && !selectionMode && (
                        <View style={styles.menuDropdown}>
                          <TouchableOpacity style={styles.menuItem} onPress={() => openEditModal(task)}>
                            <Ionicons name="pencil-outline" size={18} color="#111827" />
                            <Text style={styles.menuItemText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.menuItem} onPress={() => handleDeleteTask(task)}>
                            <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {canManageTasks && !selectionMode && (
            <TouchableOpacity
              style={[styles.addBtn, { marginBottom: insets.bottom + 6 }]}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showTaskModal} animationType="slide" transparent onRequestClose={() => setShowTaskModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTaskId ? 'Edit Task' : 'Create Task'}</Text>

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
              <Picker selectedValue={taskStatus} onValueChange={(val) => setTaskStatus(val as TaskStatus)}>
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

      <Modal visible={showStatusModal} animationType="slide" transparent onRequestClose={() => setShowStatusModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.statusModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Task Status</Text>

            {statusEditingTask && (
              <View style={styles.originalTaskInfo}>
                <Text style={styles.originalTaskLabel}>Task</Text>
                <Text style={styles.originalTaskTitleText}>{statusEditingTask.title}</Text>
                {!!statusEditingTask.description && (
                  <Text style={styles.originalTaskDesc} numberOfLines={2}>{statusEditingTask.description}</Text>
                )}
              </View>
            )}

            <Text style={styles.modalLabel}>What are you working on? <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Filling the taxation forms"
              value={statusSubTitle}
              onChangeText={setStatusSubTitle}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Details (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              multiline
              placeholder="Any additional details about your progress..."
              value={statusSubDescription}
              onChangeText={setStatusSubDescription}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusChipsRow}>
              {[
                { label: 'Pending', value: 'pending' as const, color: '#6B7280', bg: '#F3F4F6' },
                { label: 'In Progress', value: 'in_progress' as const, color: '#1D4ED8', bg: '#DBEAFE' },
                { label: 'Completed', value: 'completed' as const, color: '#166534', bg: '#DCFCE7' },
                { label: 'Cancelled', value: 'cancelled' as const, color: '#991B1B', bg: '#FEE2E2' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    statusValue === option.value && { backgroundColor: option.bg, borderColor: option.color },
                  ]}
                  onPress={() => setStatusValue(option.value)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      statusValue === option.value && { color: option.color, fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowStatusModal(false)} disabled={isStatusSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={saveEmployeeStatusUpdate} disabled={isStatusSaving}>
                {isStatusSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: accent }]}>{label}</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    marginRight: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  topActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  container: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  role: {
    marginTop: 4,
    fontSize: 14,
    color: '#4B5563',
    textTransform: 'capitalize',
  },
  userIdLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  refreshChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  taskCardSelected: {
    borderColor: '#111827',
    borderWidth: 1.6,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskDescription: {
    marginTop: 8,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  kebabButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  menuDropdown: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusRow: {
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusPickerWrap: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    height: 46,
    justifyContent: 'center',
  },
  statusPicker: {
    color: '#111827',
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  addBtn: {
    marginTop: 8,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
  },
  statusModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  originalTaskInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  originalTaskLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  originalTaskTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  originalTaskDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    fontSize: 14,
    color: '#111827',
  },
  modalTextarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  modalPickerWrap: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F9FAFB',
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
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  saveBtn: {
    backgroundColor: '#000000',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default EmployeeProfileScreen;

