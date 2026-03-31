import { getClientBilling, getReceivables } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const formatINR = (amount: number): string => {
  if (!amount && amount !== 0) return '₹0';
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    return `${d}/${m}/${y}`;
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return { bg: '#dcfce7', text: '#16a34a' };
    case 'Partial': return { bg: '#fef3c7', text: '#d97706' };
    case 'Unpaid': return { bg: '#fee2e2', text: '#dc2626' };
    case 'Overdue': return { bg: '#fecaca', text: '#991b1b' };
    default: return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

interface ClientInvoice {
  voucherNumber: string;
  date: string;
  clientName: string;
  narration: string;
  grossAmount: string;
  outstandingAmount: string;
  paymentStatus: string;
  amountCollected: number;
}

interface ClientReceivable {
  clientName: string;
  billRef: string;
  billDate: string;
  dueDate: string;
  billAmount: string;
  pendingAmount: string;
  daysOverdue: number;
  isOverdue: boolean;
  ageingBucket: string;
  dueDateFormatted: string;
}

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientName?: string; id?: string }>();
  const clientName = params.clientName ? decodeURIComponent(params.clientName) : '';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [receivables, setReceivables] = useState<ClientReceivable[]>([]);
  const [realisationRate, setRealisationRate] = useState(0);
  const [totalBilled, setTotalBilled] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [summary, setSummary] = useState({ paidCount: 0, partialCount: 0, unpaidCount: 0, totalInvoices: 0 });

  const fetchClientData = useCallback(async () => {
    if (!clientName) return;
    try {
      setError(null);
      const [billingRes, receivablesRes] = await Promise.allSettled([
        getClientBilling(clientName),
        getReceivables(),
      ]);

      // Process billing
      if (billingRes.status === 'fulfilled' && billingRes.value.success) {
        const data = billingRes.value.data;
        setInvoices(data?.invoices || []);
        setSummary(data?.summary || { paidCount: 0, partialCount: 0, unpaidCount: 0, totalInvoices: 0 });

        const clientRate = (data?.clientRealisationRates || []).find(
          (r: any) => r.clientName === clientName
        );
        if (clientRate) {
          setRealisationRate(clientRate.feeRealisationRatePercent);
          setTotalBilled(clientRate.totalBilled);
          setTotalCollected(clientRate.totalCollected);
        }
      }

      // Process receivables — filter by client name
      if (receivablesRes.status === 'fulfilled' && receivablesRes.value.success) {
        const allBills = receivablesRes.value.data?.bills || [];
        const clientBills = allBills.filter(
          (b: any) => b.clientName?.toLowerCase() === clientName.toLowerCase()
        );
        setReceivables(clientBills);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [clientName]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchClientData();
  }, [fetchClientData]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.stateText}>Loading client data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <Ionicons name="cloud-offline-outline" size={48} color="#FF3B30" />
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchClientData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingAmount = totalBilled - totalCollected;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{clientName?.charAt(0)?.toUpperCase() || 'C'}</Text>
        </View>
        <Text style={styles.name}>{clientName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Client</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Financial Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Summary</Text>
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Total Billed</Text>
              <Text style={styles.financialValue}>{formatINR(totalBilled)}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Collected</Text>
              <Text style={[styles.financialValue, { color: '#16a34a' }]}>
                {formatINR(totalCollected)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Pending</Text>
              <Text style={[styles.financialValue, { color: '#dc2626' }]}>
                {formatINR(pendingAmount)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Realisation</Text>
              <Text style={[styles.financialValue, {
                color: realisationRate >= 80 ? '#16a34a' : realisationRate >= 50 ? '#d97706' : '#dc2626'
              }]}>
                {realisationRate.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Realisation Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.min(realisationRate, 100)}%`,
              backgroundColor: realisationRate >= 80 ? '#16a34a'
                : realisationRate >= 50 ? '#d97706' : '#dc2626',
            }]} />
          </View>
        </View>

        {/* Invoice Summary Chips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invoice Summary</Text>
          <View style={styles.chipRow}>
            <View style={[styles.summaryChip, { backgroundColor: '#f0f0f0' }]}>
              <Text style={styles.chipLabel}>Total</Text>
              <Text style={styles.chipValue}>{summary.totalInvoices}</Text>
            </View>
            <View style={[styles.summaryChip, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.chipLabel}>Paid</Text>
              <Text style={[styles.chipValue, { color: '#16a34a' }]}>{summary.paidCount}</Text>
            </View>
            <View style={[styles.summaryChip, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.chipLabel}>Partial</Text>
              <Text style={[styles.chipValue, { color: '#d97706' }]}>{summary.partialCount}</Text>
            </View>
            <View style={[styles.summaryChip, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.chipLabel}>Unpaid</Text>
              <Text style={[styles.chipValue, { color: '#dc2626' }]}>{summary.unpaidCount}</Text>
            </View>
          </View>
        </View>

        {/* Outstanding Receivables */}
        {receivables.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Outstanding Receivables</Text>
            {receivables.map((bill, index) => (
              <View key={`${bill.billRef}-${index}`} style={styles.receivableItem}>
                <View style={styles.receivableHeader}>
                  <Text style={styles.receivableRef}>{bill.billRef || '-'}</Text>
                  {bill.isOverdue && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueText}>{bill.daysOverdue}d overdue</Text>
                    </View>
                  )}
                </View>
                <View style={styles.receivableRow}>
                  <Text style={styles.receivableLabel}>Amount: {formatINR(parseFloat(bill.billAmount) || 0)}</Text>
                  <Text style={[styles.receivableLabel, { color: '#dc2626' }]}>
                    Pending: {formatINR(parseFloat(bill.pendingAmount) || 0)}
                  </Text>
                </View>
                <Text style={styles.receivableDate}>
                  Due: {bill.dueDateFormatted || formatDate(bill.dueDate)} • Bucket: {bill.ageingBucket}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Invoices List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Invoices ({invoices.length})</Text>
          {invoices.length === 0 ? (
            <Text style={styles.emptyText}>No invoices found for this client</Text>
          ) : (
            invoices.map((inv, index) => {
              const statusColor = getStatusColor(inv.paymentStatus);
              return (
                <View key={`${inv.voucherNumber}-${index}`} style={styles.invoiceItem}>
                  <View style={styles.invoiceHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceNumber}>{inv.voucherNumber}</Text>
                      <Text style={styles.invoiceDate}>{formatDate(inv.date)}</Text>
                    </View>
                    <View style={[styles.invoiceStatusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.invoiceStatusText, { color: statusColor.text }]}>
                        {inv.paymentStatus}
                      </Text>
                    </View>
                  </View>
                  {inv.narration ? (
                    <Text style={styles.invoiceNarration} numberOfLines={1}>{inv.narration}</Text>
                  ) : null}
                  <View style={styles.invoiceAmounts}>
                    <Text style={styles.invoiceAmount}>
                      Amount: {formatINR(parseFloat(inv.grossAmount) || 0)}
                    </Text>
                    <Text style={[styles.invoiceAmount, { color: '#16a34a' }]}>
                      Collected: {formatINR(inv.amountCollected || 0)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  },
  stateText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3b82f6',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  financialItem: {
    width: '46%',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  chipValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  receivableItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  receivableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  receivableRef: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  overdueBadge: {
    backgroundColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
  },
  receivableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receivableLabel: {
    fontSize: 13,
    color: '#666',
  },
  receivableDate: {
    fontSize: 12,
    color: '#999',
  },
  invoiceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invoiceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceNarration: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  invoiceAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceAmount: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});