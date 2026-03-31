import { useAuth } from '@/context/AuthContext';
import { TaskListSkeleton } from '@/components/common/Skeleton';
import { createTask, getTasks, updateTaskStatus, updateTask, deleteTask } from '@/services/api';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronDown, ChevronUp, Clock, FileCheck, FileText, Pencil, Plus, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Task {
  id: number;
  name: string;
  completed: boolean;
}

interface WorkflowStage {
  id: number;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
  description: string;
  tasks: Task[];
}

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  dotColor: string;
}

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
  performanceStatus: string;
  taskStatus: string;
  joinedDate: string;
  nextReviewDate: string;
  specializations: string[];
}

const EmployeeProfileScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const { user } = useAuth();

  const [expandedStage, setExpandedStage] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await getTasks({ assignedTo: employeeId });
      if (res && res.success) {
        setTasks(res.data);
      }
    } catch (e) {
      console.log('Error fetching tasks', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchTasks();
    } else {
      setIsLoading(false);
    }
  }, [employeeId]);

  const employeeData: EmployeeData = {
    id: employeeId || 'EMP001',
    name: params.name ? String(params.name) : 'Employee Profile',
    role: params.role ? String(params.role) : 'Team Member',
    department: 'Standard Department',
    status: 'Active',
    performanceStatus: 'Excellent',
    taskStatus: 'On Track',
    joinedDate: 'Jan 2024',
    nextReviewDate: 'Jun 2024',
    specializations: ['Account Management', 'Reporting']
  };

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'completed':
        return { bg: '#dcfce7', text: '#16a34a', label: 'COMPLETED', dotColor: '#16a34a' };
      case 'in_progress':
        return { bg: '#dbeafe', text: '#2563eb', label: 'IN PROGRESS', dotColor: '#2563eb' };
      case 'pending':
        return { bg: '#f3f4f6', text: '#6b7280', label: 'PENDING', dotColor: '#d1d5db' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#dc2626', label: 'CANCELLED', dotColor: '#dc2626' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: 'PENDING', dotColor: '#d1d5db' };
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string): Promise<void> => {
    try {
      const res = await updateTaskStatus(taskId, newStatus);
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId || t._id === taskId ? { ...t, status: newStatus } : t));
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const toggleExpand = (id: string): void => {
    setExpandedStage(expandedStage === id ? '' : id);
  };

  const openCreateModal = () => {
    setEditingTaskId(null);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskStatus('pending');
    setShowTaskModal(true);
  };

  const openEditModal = (task: any) => {
    const id = task.id || task._id;
    setEditingTaskId(id);
    setNewTaskTitle(task.title || '');
    setNewTaskDesc(task.description || '');
    setNewTaskStatus(task.status || 'pending');
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingTaskId) {
        // Edit existing task
        const res = await updateTask(editingTaskId, {
          title: newTaskTitle,
          description: newTaskDesc,
          status: newTaskStatus,
        });
        if (res.success) {
          setShowTaskModal(false);
          fetchTasks();
        } else {
          Alert.alert('Error', res.message || 'Failed to update task');
        }
      } else {
        // Create new task
        const res = await createTask({
          title: newTaskTitle,
          description: newTaskDesc,
          status: newTaskStatus,
          assignedTo: employeeId,
        });
        if (res.success) {
          setShowTaskModal(false);
          setNewTaskTitle('');
          setNewTaskDesc('');
          setNewTaskStatus('pending');
          fetchTasks();
        } else {
          Alert.alert('Error', res.message || 'Failed to create task');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error saving task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = (task: any) => {
    const id = task.id || task._id;
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteTask(id);
              if (res.success) {
                fetchTasks();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Employee Profile</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <User size={40} color="#3b82f6" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{employeeData.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={styles.company}>{employeeData.role}</Text>
              <View style={styles.companyDot} />
              <Text style={styles.department}>{employeeData.department}</Text>
            </View>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{employeeData.status}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Employee Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employee Details</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <FileText size={18} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Performance Status</Text>
                <Text style={[styles.detailValue, styles.excellentText]}>
                  {employeeData.performanceStatus}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Clock size={18} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Task Status</Text>
                <Text style={[styles.detailValue, styles.onTrackText]}>
                  {employeeData.taskStatus}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Calendar size={18} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Joined Date</Text>
                <Text style={styles.detailValue}>{employeeData.joinedDate}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Calendar size={18} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Next Review Date</Text>
                <Text style={styles.detailValue}>{employeeData.nextReviewDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Active Tasks Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Employee Tasks</Text>
          </View>

          <View style={styles.workflowContainer}>
            {isLoading ? (
              <TaskListSkeleton count={4} />
            ) : tasks.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#666666', marginBottom: 20 }}>No tasks found for this employee.</Text>
            ) : (
              tasks.map((task, index, filteredArray) => {
                const config = getStatusConfig(task.status);
                const Icon = FileCheck;
                const taskId = task.id || task._id;
                const isExpanded = expandedStage === taskId;

                return (
                  <View key={taskId} style={styles.workflowStage}>
                    {/* Timeline Dot */}
                    <View style={styles.timelineContainer}>
                      <View style={[styles.timelineDot, { backgroundColor: config.dotColor }]} />
                      {index < filteredArray.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>

                    {/* Stage Card */}
                    <View style={styles.stageCard}>
                      <TouchableOpacity
                        style={styles.stageHeader}
                        onPress={() => toggleExpand(taskId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.stageLeft}>
                          <View style={styles.stageIcon}>
                            <Icon size={24} color="#374151" />
                          </View>
                          <View style={styles.stageInfo}>
                            <Text style={styles.stageName}>{task.title}</Text>
                            <View style={[styles.statusPickerContainer, { backgroundColor: config.bg }]}>
                              <Picker
                                selectedValue={task.status}
                                onValueChange={(itemValue) => handleStatusChange(taskId, String(itemValue))}
                                style={styles.statusPicker}
                                dropdownIconColor={config.text}
                              >
                                <Picker.Item label="PENDING" value="pending" />
                                <Picker.Item label="IN PROGRESS" value="in_progress" />
                                <Picker.Item label="COMPLETED" value="completed" />
                                <Picker.Item label="CANCELLED" value="cancelled" />
                              </Picker>
                            </View>
                          </View>
                        </View>
                        <View style={styles.expandIcon}>
                          {isExpanded ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.stageDetails}>
                          <Text style={styles.stageDescription}>
                            {task.description || 'No description provided.'}
                          </Text>
                          {task.clientName && (
                            <Text style={[styles.stageDescription, { fontWeight: '600' }]}>
                              Client: {task.clientName}
                            </Text>
                          )}
                          <View style={styles.taskActionRow}>
                            <TouchableOpacity style={styles.taskEditBtn} onPress={() => openEditModal(task)}>
                              <Pencil size={14} color="#FFF" />
                              <Text style={styles.taskEditBtnText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.taskDeleteBtn} onPress={() => handleDeleteTask(task)}>
                              <Trash2 size={14} color="#FFF" />
                              <Text style={styles.taskDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Add Task Button */}
          <TouchableOpacity
            style={styles.assignButton}
            onPress={openCreateModal}
            activeOpacity={0.8}
          >
            <Plus size={22} color="#FFFFFF" />
            <Text style={styles.assignButtonText}>Log / Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Task Creation Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingTaskId ? 'Edit Task' : 'Add New Task'}</Text>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Reviewed Q3 Reports"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Detailed description..."
              multiline
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.modalPickerWrapper}>
              <Picker
                selectedValue={newTaskStatus}
                onValueChange={(val) => setNewTaskStatus(val)}
                style={styles.modalPicker}
              >
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="In Progress" value="in_progress" />
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowTaskModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSaveTask}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>{editingTaskId ? 'Update' : 'Save Task'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  companyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  company: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  excellentText: {
    color: '#16a34a',
  },
  onTrackText: {
    color: '#2563eb',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  workflowContainer: {
    position: 'relative',
  },
  workflowStage: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timelineContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    minHeight: 60,
    marginTop: 8,
  },
  stageCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  stageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stageIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusPickerContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    height: 28,
    justifyContent: 'center',
  },
  statusPicker: {
    height: 28,
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    marginLeft: 8,
  },
  stageDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 76,
  },
  stageDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 21,
  },
  tasksSection: {
    marginTop: 16,
  },
  tasksTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    fontSize: 14,
    fontWeight: '500',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111', // Changed to black
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
    shadowColor: '#111111', // Changed shadow to match black button
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000000',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  modalPickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  modalPicker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonSubmit: {
    backgroundColor: '#000000',
  },
  modalButtonSubmitText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  taskActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  taskEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  taskEditBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  taskDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  taskDeleteBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default EmployeeProfileScreen;