import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Employee } from '../../types';
import Avatar from '../common/Avatar';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
  onAssignTask: () => void;
  showAssignButton: boolean;
}

export default function EmployeeCard({ 
  employee, 
  onPress, 
  onAssignTask,
  showAssignButton 
}: EmployeeCardProps) {
  const isActive = employee.isActive ?? employee.status === 'active';
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Avatar name={employee.name} size={50} />
        <View style={styles.info}>
          <Text style={styles.name}>{employee.name}</Text>
          <Text style={styles.department}>{employee.department}</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: isActive ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.statusText}>
              {isActive ? 'Active' : 'Offline'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employee.tasksCompleted || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employee.tasksAssigned || 0}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
      </View>

      {showAssignButton && (
        <TouchableOpacity 
          style={styles.assignButton}
          onPress={(e) => {
            e.stopPropagation();
            onAssignTask();
          }}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.assignButtonText}>Assign Task</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  assignButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});