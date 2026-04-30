import { DetailSkeleton } from '@/components/common/Skeleton';
import { formatNameWithPrefix } from '@/lib/namePrefix';
import { getClient, getEmployees } from '@/services/api';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ClientData = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  contactPerson?: string;
  licenseNum?: string;
  licenseExpire?: string;
  groupEmployeeIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};


export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientName?: string; id?: string }>();
  const clientId = String(params.id || '');
  const fallbackName = params.clientName ? decodeURIComponent(String(params.clientName)) : 'Client';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [client, setClient] = useState<ClientData | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);


  const fetchClient = useCallback(async (forceRefresh = false) => {
    if (!clientId) {
      setError('Client ID is missing');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setError(null);

      // Fetch client and employees in parallel
      const [clientRes, employeesRes] = await Promise.all([
        getClient(clientId, {
          forceRefresh,
          staleWhileRevalidate: !forceRefresh,
        }),
        getEmployees({ forceRefresh })
      ]);

      if (employeesRes.success) {
        setEmployees(employeesRes.data || []);
      }

      if (clientRes.success && clientRes.data) {
        setClient(clientRes.data as ClientData);
      } else {
        setError(clientRes.message || 'Client not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load client');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [clientId]);


  useEffect(() => {
    void fetchClient(false);
  }, [fetchClient]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchClient(true);
  }, [fetchClient]);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const groupEmployeeNames = () => {
    if (!client?.groupEmployeeIds || client.groupEmployeeIds.length === 0) return '-';

    return client.groupEmployeeIds
      .map(id => {
        const emp = employees.find(e => String(e.id || e._id) === String(id));
        return emp ? formatNameWithPrefix(emp.name, emp.gender) : null;
      })
      .filter(Boolean)
      .join(', ') || '-';
  };


  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !client) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
        <Text style={styles.stateText}>{error || 'Client not found'}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={() => onRefresh()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryButton, styles.backButton]} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(client.name || fallbackName).charAt(0).toUpperCase()}</Text>
        </View>

        <Text style={styles.name}>{client.name || fallbackName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Client</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Information</Text>
          <InfoRow icon="mail-outline" label="Email" value={client.email || '-'} />
          <InfoRow icon="call-outline" label="Phone" value={client.phone || '-'} />
          <InfoRow icon="location-outline" label="Location" value={client.location || '-'} />
          <InfoRow icon="person-outline" label="Contact Person" value={client.contactPerson || '-'} />
          <InfoRow icon="document-text-outline" label="License No." value={client.licenseNum || '-'} />
          <InfoRow icon="calendar-outline" label="License Expire" value={formatDate(client.licenseExpire)} />
          <InfoRow icon="people-outline" label="Client Group" value={groupEmployeeNames()} />
          <InfoRow icon="time-outline" label="Created" value={formatDate(client.createdAt)} />
          <InfoRow icon="refresh-outline" label="Updated" value={formatDate(client.updatedAt)} />
        </View>
      </View>


      <View style={{ height: 30 }} />
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
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stateText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButton: {
    backgroundColor: '#374151',
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 4,
  },
  avatar: {
    marginTop: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8E4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#6B4EFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    marginTop: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIcon: {
    width: 28,
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
});
