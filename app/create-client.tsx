import { formatNameWithPrefix } from '@/lib/namePrefix';
import { normalizeRole } from '@/lib/roles';
import { createClient, getEmployees } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

export default function CreateClient() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseExpire, setLicenseExpire] = useState('');
  const [licenseExpireDate, setLicenseExpireDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedGroupEmployeeIds, setSelectedGroupEmployeeIds] = useState<string[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoadingEmployees(true);
        const res = await getEmployees();
        if (res.success) {
          const users = res.data || [];
          const onlyEmployees = users.filter((u: any) => normalizeRole(u?.role) === 'employee');
          setEmployees(onlyEmployees);
        }
      } catch (error) {
        console.log('Failed to load employees for client group', error);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  const selectedGroupNames = useMemo(() => {
    if (selectedGroupEmployeeIds.length === 0) return '';
    return employees
      .filter((emp) => selectedGroupEmployeeIds.includes(String(emp.id || emp._id)))
      .map((emp) => formatNameWithPrefix(emp.name, emp.gender))
      .join(', ');
  }, [employees, selectedGroupEmployeeIds]);

  const toggleGroupEmployee = (employeeId: string) => {
    setSelectedGroupEmployeeIds((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      }
      return [...prev, employeeId];
    });
  };

  const handleCreateClient = async () => {
    if (!name || !phone || !email || !location || !contactPerson || !licenseNum || !licenseExpire) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await createClient({
        name,
        phone,
        email,
        location,
        contactPerson,
        licenseNum,
        licenseExpire: new Date(licenseExpireDate).toISOString(),
        groupEmployeeIds: selectedGroupEmployeeIds,
      });

      if (res.success) {
        Alert.alert('Success', `Client "${name}" created successfully`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to create client');
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
      setLicenseExpireDate(date);
      setLicenseExpire(date.toISOString().split('T')[0]);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create New Client</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput style={styles.input} placeholder="Enter client name" value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput style={styles.input} placeholder="Enter location" value={location} onChangeText={setLocation} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Contact Person <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact person name"
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter license number"
              value={licenseNum}
              onChangeText={setLicenseNum}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Group (Employees)</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowGroupDropdown(!showGroupDropdown)}>
              <Text
                style={selectedGroupEmployeeIds.length > 0 ? styles.dateText : styles.placeholderText}
                numberOfLines={1}
              >
                {selectedGroupEmployeeIds.length > 0
                  ? `${selectedGroupEmployeeIds.length} selected`
                  : isLoadingEmployees
                    ? 'Loading employees...'
                    : 'Select employees'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>

            {showGroupDropdown && (
              <View style={styles.dropdown}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {employees.length === 0 && !isLoadingEmployees && (
                    <Text style={{ padding: 12, color: '#666666' }}>No employees available</Text>
                  )}
                  {employees.map((employee) => {
                    const employeeId = String(employee.id || employee._id);
                    const isSelected = selectedGroupEmployeeIds.includes(employeeId);
                    return (
                      <TouchableOpacity
                        key={employeeId}
                        style={styles.dropdownItem}
                        onPress={() => toggleGroupEmployee(employeeId)}
                      >
                        <Text style={styles.dropdownItemText}>
                          {formatNameWithPrefix(employee.name, employee.gender)}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#000000" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {!!selectedGroupNames && (
              <Text style={styles.selectedGroupText} numberOfLines={2}>
                {selectedGroupNames}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              License Expiry Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={licenseExpire ? styles.dateText : styles.placeholderText}>
                {licenseExpire || 'Select expiry date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={licenseExpireDate} mode="date" display="default" onChange={handleDateChange} />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { marginBottom: insets.bottom + 16 }, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCreateClient}
          disabled={isSubmitting}
        >
          <Ionicons name="person-add" size={22} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Creating...' : 'Create Client'}</Text>
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
  content: {
    flex: 1,
  },
  headerTitleContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
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
  selectedGroupText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 12,
  },
});
