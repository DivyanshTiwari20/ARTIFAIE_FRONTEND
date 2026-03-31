import { getClient, updateClient, deleteClient } from '@/services/api';
import { DetailSkeleton } from '@/components/common/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientName?: string; id?: string }>();
  const clientId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editLicenseNum, setEditLicenseNum] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setError('No client ID provided');
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await getClient(clientId);
      if (res.success && res.data) {
        setClient(res.data);
      } else {
        setError('Client not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const openEditModal = () => {
    if (!client) return;
    setEditName(client.name || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditLocation(client.location || '');
    setEditContactPerson(client.contactPerson || '');
    setEditLicenseNum(client.licenseNum || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await updateClient(clientId, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        location: editLocation,
        contactPerson: editContactPerson,
        licenseNum: editLicenseNum,
      });
      if (res.success) {
        setClient(res.data);
        setShowEditModal(false);
        Alert.alert('Success', 'Client updated');
      } else {
        Alert.alert('Error', res.message || 'Failed to update');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${client?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteClient(clientId);
              if (res.success) {
                Alert.alert('Deleted', 'Client has been deleted');
                router.back();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete client');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !client) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.stateText}>{error || 'Client not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {client.name?.charAt(0)?.toUpperCase() || 'C'}
          </Text>
        </View>
        <Text style={styles.name}>{client.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Client</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#FFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Client Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Information</Text>
          <View style={styles.infoGrid}>
            <InfoRow icon="mail-outline" label="Email" value={client.email || 'N/A'} />
            <InfoRow icon="call-outline" label="Phone" value={client.phone || 'N/A'} />
            <InfoRow icon="location-outline" label="Location" value={client.location || 'N/A'} />
            <InfoRow icon="person-outline" label="Contact Person" value={client.contactPerson || 'N/A'} />
            <InfoRow icon="document-text-outline" label="License No." value={client.licenseNum || 'N/A'} />
            <InfoRow icon="calendar-outline" label="License Expire" value={formatDate(client.licenseExpire)} />
            <InfoRow icon="time-outline" label="Added On" value={formatDate(client.createdAt)} />
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Client</Text>

            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Client name" />

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput style={styles.modalInput} value={editEmail} onChangeText={setEditEmail} placeholder="Email" keyboardType="email-address" />

            <Text style={styles.modalLabel}>Phone</Text>
            <TextInput style={styles.modalInput} value={editPhone} onChangeText={setEditPhone} placeholder="Phone" keyboardType="phone-pad" />

            <Text style={styles.modalLabel}>Location</Text>
            <TextInput style={styles.modalInput} value={editLocation} onChangeText={setEditLocation} placeholder="Location" />

            <Text style={styles.modalLabel}>Contact Person</Text>
            <TextInput style={styles.modalInput} value={editContactPerson} onChangeText={setEditContactPerson} placeholder="Contact person" />

            <Text style={styles.modalLabel}>License No.</Text>
            <TextInput style={styles.modalInput} value={editLicenseNum} onChangeText={setEditLicenseNum} placeholder="License number" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowEditModal(false)} disabled={isSubmitting}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSubmit]} onPress={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalButtonSubmitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#6b7280" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centerState: { justifyContent: 'center', alignItems: 'center' },
  stateText: { fontSize: 15, color: '#999', marginTop: 12 },
  retryButton: { marginTop: 16, backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontWeight: '600' },
  header: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8E4F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#6B4EFF' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  statusText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  editButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  deleteButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoGrid: { gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#000' },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 14, backgroundColor: '#F9FAFB' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalButtonCancel: { backgroundColor: '#F3F4F6' },
  modalButtonCancelText: { color: '#374151', fontWeight: '600', fontSize: 16 },
  modalButtonSubmit: { backgroundColor: '#000' },
  modalButtonSubmitText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});