import { formatNameWithPrefix } from '@/lib/namePrefix';
import { normalizeRole } from '@/lib/roles';
import { createTask, getClients, getEmployees } from '@/services/api';
import { Priority } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateTask() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAssigneeTypeDropdown, setShowAssigneeTypeDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<string | null>(null);
  const [otherCategory, setOtherCategory] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [assigneeType, setAssigneeType] = useState<'employee' | 'admin'>('employee');
  const [selectedAssignee, setSelectedAssignee] = useState<any | null>(null);
  const [deadlineDate, setDeadlineDate] = useState(new Date());

  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  const categories = [
    'Accounting',
    'CFO',
    'Income Tax / Corporation Tax',
    'Visa',
    'MISE Certificates',
    'Market Survey',
    'Meetings',
    'VAT / CA / Company Incorporation',
    'Others',
  ];
  const assigneeTypes: ('employee' | 'admin')[] = ['employee', 'admin'];

  const [employees, setEmployees] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [dbClients, setDbClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingClients(true);
        const [employeesRes, clientsRes] = await Promise.all([getEmployees(), getClients()]);

        if (employeesRes.success) {
          const users = employeesRes.data || [];
          setEmployees(users.filter((user: any) => normalizeRole(user?.role) === 'employee'));
          setAdmins(users.filter((user: any) => normalizeRole(user?.role) === 'admin'));
        }

        if (clientsRes.success) {
          setDbClients(clientsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchInitialData();
  }, []);

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'low':
        return '#34C759';
      case 'medium':
        return '#FF9500';
      case 'high':
        return '#FF3B30';
      case 'urgent':
        return '#8E0000';
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !deadline || !selectedAssignee) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (category === 'Others' && !otherCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name for Others');
      return;
    }

    try {
      setIsSubmitting(true);

      const finalCategory = category === 'Others' ? otherCategory.trim() : category || undefined;
      const client = selectedClient
        ? dbClients.find((c) => (c.id || c._id) === selectedClient)
        : null;
      const clientName = client?.name || undefined;

      const res = await createTask({
        title,
        description,
        category: finalCategory,
        priority,
        assignedTo: selectedAssignee.id || selectedAssignee._id,
        clientName,
        dueDate: new Date(deadlineDate).toISOString(),
      });

      if (res.success) {
        Alert.alert('Success', `Task "${title}" created successfully`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to assign task');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setDeadlineDate(date);
      setDeadline(date.toISOString().split('T')[0]);
    }
  };

  const selectedClientName = selectedClient
    ? dbClients.find((c) => (c.id || c._id) === selectedClient)?.name
    : null;
  const assignees = assigneeType === 'employee' ? employees : admins;
  const selectedAssigneeName = selectedAssignee ? formatNameWithPrefix(selectedAssignee.name, selectedAssignee.gender) : null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create New Task</Text>
        </View>

        <View style={styles.form}>
          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Task Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
            />
          </View> */}



          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Task Assigned To <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowAssigneeTypeDropdown(!showAssigneeTypeDropdown)}
            >
              <Text style={styles.dateText}>{assigneeType.charAt(0).toUpperCase() + assigneeType.slice(1)}</Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>
            {showAssigneeTypeDropdown && (
              <View style={styles.dropdown}>
                {assigneeTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setAssigneeType(type);
                      setSelectedAssignee(null);
                      setShowAssigneeTypeDropdown(false);
                      setShowAssigneeDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    {assigneeType === type && <Ionicons name="checkmark" size={20} color="#000000" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {assigneeType.charAt(0).toUpperCase() + assigneeType.slice(1)} <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
            >
              <Text style={selectedAssignee ? styles.dateText : styles.placeholderText}>
                {selectedAssigneeName || `Select ${assigneeType}`}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>
            {showAssigneeDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {assignees.length === 0 && (
                    <Text style={{ padding: 12, color: '#666666' }}>No {assigneeType}s available</Text>
                  )}
                  {assignees.map((assignee) => (
                    <TouchableOpacity
                      key={assignee.id || assignee._id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedAssignee(assignee);
                        setShowAssigneeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{formatNameWithPrefix(assignee.name, assignee.gender)}</Text>
                      {selectedAssignee &&
                        (selectedAssignee.id === assignee.id ||
                          selectedAssignee._id === assignee._id) && (
                          <Ionicons name="checkmark" size={20} color="#000000" />
                        )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text style={category ? styles.dateText : styles.placeholderText}>
                {category || 'Select category (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>
            {showCategoryDropdown && (
              <View style={styles.dropdown}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(cat);
                      if (cat !== 'Others') {
                        setOtherCategory('');
                      }
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                    {category === cat && <Ionicons name="checkmark" size={20} color="#000000" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {category === 'Others' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Enter custom category"
                value={otherCategory}
                onChangeText={setOtherCategory}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowClientDropdown(!showClientDropdown)}
            >
              <Text style={selectedClient ? styles.dateText : styles.placeholderText}>
                {selectedClientName || (isLoadingClients ? 'Loading clients...' : 'Select client (optional)')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>
            {showClientDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {dbClients.length === 0 && !isLoadingClients && (
                    <Text style={{ padding: 12, color: '#666666' }}>No clients available</Text>
                  )}
                  {dbClients.map((client) => {
                    const id = client.id || client._id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedClient(id);
                          setShowClientDropdown(false);
                        }}
                      >
                        <View>
                          <Text style={styles.dropdownItemText}>{client.name}</Text>
                          <Text style={styles.dropdownItemSubtext}>
                            {client.location || client.email || 'No details'}
                          </Text>
                        </View>
                        {selectedClient === id && <Ionicons name="checkmark" size={20} color="#000000" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter task description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && {
                      backgroundColor: `${getPriorityColor(p)}20`,
                      borderColor: getPriorityColor(p),
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[styles.priorityText, priority === p && { color: getPriorityColor(p) }]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Deadline <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={deadline ? styles.dateText : styles.placeholderText}>
                {deadline || 'Select deadline date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={deadlineDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.assignButton, { marginBottom: insets.bottom + 16 }, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCreateTask}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.assignButtonText}>{isSubmitting ? 'Creating...' : 'Create Task'}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  headerTitleContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  headerTitle: {
    marginTop: 30,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  form: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  assignButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: '#000000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999999',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000000',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
});





