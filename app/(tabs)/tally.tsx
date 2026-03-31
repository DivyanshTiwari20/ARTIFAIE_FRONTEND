import { apiFetch } from '@/services/api';
import SkeletonBlock from '@/components/common/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ENDPOINTS = [
  { id: '1', title: 'Test Tally connection (public)', url: '/api/tally/test-public', icon: 'pulse-outline' },
  { id: '2', title: 'Run connection diagnostics', url: '/api/tally/diagnostics', icon: 'analytics-outline' },
  { id: '3', title: 'List companies in Tally', url: '/api/tally/companies', icon: 'business-outline' },
  { id: '4', title: 'Enhanced Trial Balance', url: '/api/tally/trial-balance', icon: 'scale-outline' },
  { id: '5', title: 'List all ledgers', url: '/api/tally/ledgers', icon: 'book-outline' },
  { id: '6', title: 'List all ledger groups', url: '/api/tally/ledger-groups', icon: 'folder-outline' },
  { id: '7', title: 'Day Book report', url: '/api/tally/day-book', icon: 'calendar-outline' },
  { id: '8', title: 'Stock items', url: '/api/tally/stock-items', icon: 'cube-outline' },
  { id: '9', title: 'Stock groups', url: '/api/tally/stock-groups', icon: 'layers-outline' },
  { id: '10', title: 'Vouchers by type (Sales)', url: '/api/tally/vouchers/Sales', icon: 'document-text-outline' },
  { id: '11', title: 'Accounts receivable with ageing', url: '/api/tally/receivables', icon: 'arrow-down-circle-outline' },
  { id: '12', title: 'Accounts payable with TDS', url: '/api/tally/payables', icon: 'arrow-up-circle-outline' },
  { id: '13', title: 'P&L with comparisons', url: '/api/tally/profit-loss', icon: 'trending-up-outline' },
  { id: '14', title: 'GST with filing dates', url: '/api/tally/gst-summary', icon: 'receipt-outline' },
  { id: '15', title: 'Client billing & realisation', url: '/api/tally/client-billing', icon: 'people-outline' },
  { id: '16', title: 'Bank & cash position', url: '/api/tally/bank-position', icon: 'card-outline' },
  { id: '17', title: 'Invoice register with tax', url: '/api/tally/invoice-register', icon: 'list-outline' },
  { id: '18', title: 'Balance sheet with categories', url: '/api/tally/balance-sheet', icon: 'document-outline' },
  { id: '19', title: 'Reports summary', url: '/api/tally/reports/summary', icon: 'stats-chart-outline' },
];

const TallyEndpointCard = ({ endpoint }: { endpoint: typeof ENDPOINTS[0] }) => {
  const [dataStatus, setDataStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    setDataStatus('loading');
    
    // We put a tiny delay simply to avoid sending 19 parallel requests at the exact same millisecond
    const delay = parseInt(endpoint.id) * 300; 
    
    setTimeout(() => {
      apiFetch(endpoint.url)
        .then((res: any) => {
          if (!active) return;
          if (res && res.success) setDataStatus('success');
          else setDataStatus('error');
        })
        .catch(() => {
          if (!active) return;
          setDataStatus('error');
        });
    }, delay);

    return () => { active = false; };
  }, [endpoint.url]);

  return (
    <View style={styles.fieldBox}>
      <View style={styles.fieldIcon}>
        <Ionicons name={endpoint.icon as any} size={24} color="#333" />
      </View>
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldLabel}>{endpoint.title}</Text>
        <View style={styles.statusRow}>
          {dataStatus === 'loading' ? (
            <>
              <SkeletonBlock width={100} height={14} borderRadius={4} />
            </>
          ) : dataStatus === 'success' ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" style={{ marginRight: 4 }} />
              <Text style={styles.successText}>Data loaded successfully</Text>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={16} color="#FF3B30" style={{ marginRight: 4 }} />
              <Text style={styles.errorTextSmall}>Failed to load</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default function Tally() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tally Data Integrations</Text>
      </View>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtext}>
          These modules connect directly to your Tally TDL server in real-time. Wait for all modules to sync.
        </Text>
        <View style={styles.listContainer}>
          {ENDPOINTS.map((endpoint) => (
            <TallyEndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
        </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingTextSmall: {
    fontSize: 13,
    color: '#666666',
  },
  successText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
  errorTextSmall: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
});
