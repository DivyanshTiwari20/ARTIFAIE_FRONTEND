import { dummyClients } from '@/data/dummpyData';
import { createTask } from '@/services/api';
import { Priority } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AssignTask() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const employeeId = params.employeeId as string;
  const employeeName = params.employeeName as string;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
const [selectedDate, setSelectedDate] = useState(new Date());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [deadlineDate, setDeadlineDate] = useState(new Date());
  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  const categories = ['Incorporation', 'HR', 'CFO', 'Legal', 'Compliance'];

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

  const handleAssignTask = async () => {
    if (!title || !description || !deadline || !category || !selectedClient) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const clientName = dummyClients.find((c) => c.id === selectedClient)?.name;
      
      const res = await createTask({
        title,
        description,
        category,
        priority,
        assignedTo: employeeId,
        clientName: clientName || '',
        dueDate: new Date(deadlineDate).toISOString(),
      });

      if (res.success) {
        Alert.alert(
          'Success',
          `Task "${title}" assigned to ${employeeName}`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to assign task');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  //for showing the date picker
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setDeadline(date.toISOString().split('T')[0]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Task</Text>
        <View style={styles.placeholder} />
      </View> */}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Assignee Info */}
        <View style={styles.assigneeCard}>
          <Text style={styles.assigneeLabel}>Assigning to:</Text>
          <Text style={styles.assigneeName}>{employeeName}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Task Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
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

          {/* Category */}
<View style={styles.inputGroup}>
  <Text style={styles.label}>
    Category <Text style={styles.required}>*</Text>
  </Text>
  <TouchableOpacity
    style={styles.input}
    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
  >
    <Text style={category ? styles.dateText : styles.placeholderText}>
      {category || 'Select category'}
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
            setShowCategoryDropdown(false);
          }}
        >
          <Text style={styles.dropdownItemText}>{cat}</Text>
          {category === cat && (
            <Ionicons name="checkmark" size={20} color="#000000" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
{/* Client */}
{/* Client */}
<View style={styles.inputGroup}>
  <Text style={styles.label}>
    Client <Text style={styles.required}>*</Text>
  </Text>
  <TouchableOpacity
    style={styles.input}
    onPress={() => setShowClientDropdown(!showClientDropdown)}
  >
    <Text style={selectedClient ? styles.dateText : styles.placeholderText}>
      {selectedClient 
        ? dummyClients.find(c => c.id === selectedClient)?.name 
        : 'Select client'}
    </Text>
    <Ionicons name="chevron-down" size={20} color="#666666" />
  </TouchableOpacity>
  {showClientDropdown && (
    <View style={styles.dropdown}>
      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
        {dummyClients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedClient(client.id);
              setShowClientDropdown(false);
            }}
          >
            <View>
              <Text style={styles.dropdownItemText}>{client.name}</Text>
              <Text style={styles.dropdownItemSubtext}>{client.company}</Text>
            </View>
            {selectedClient === client.id && (
              <Ionicons name="checkmark" size={20} color="#000000" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )}
</View>
          {/* Priority */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && {
                      backgroundColor: getPriorityColor(p) + '20',
                      borderColor: getPriorityColor(p),
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p && { color: getPriorityColor(p) },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Deadline */}
          {/* Deadline */}
<View style={styles.inputGroup}>
  <Text style={styles.label}>
    Deadline <Text style={styles.required}>*</Text>
  </Text>
  <TouchableOpacity
    style={styles.input}
    onPress={() => setShowDatePicker(true)}
  >
    <Text style={deadline ? styles.dateText : styles.placeholderText}>
      {deadline ? deadline : 'Select deadline date'}
    </Text>
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

        {/* Assign Button */}
        <TouchableOpacity 
          style={[styles.assignButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleAssignTask}
          disabled={isSubmitting}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.assignButtonText}>
            {isSubmitting ? 'Assigning...' : 'Assign Task'}
          </Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  assigneeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    // borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  assigneeLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  assigneeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
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
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  helperText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
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
    maxHeight: 200,
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