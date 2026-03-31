import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBlockProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E1E1E1',
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for an employee/client card */
export function CardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.cardRow}>
        <SkeletonBlock width={48} height={48} borderRadius={24} />
        <View style={skStyles.cardText}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={skStyles.cardStats}>
        <SkeletonBlock width="30%" height={14} />
        <SkeletonBlock width="30%" height={14} />
        <SkeletonBlock width="30%" height={14} />
      </View>
    </View>
  );
}

/** Skeleton for the employee/client list page */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <SkeletonBlock width={120} height={14} style={{ marginBottom: 12 }} />
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Skeleton for a notification card */
export function NotificationSkeleton() {
  return (
    <View style={skStyles.notifCard}>
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={skStyles.notifText}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="90%" height={12} style={{ marginTop: 8 }} />
        <SkeletonBlock width="30%" height={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Skeleton for the notification list */
export function NotificationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </View>
  );
}

/** Skeleton for a detail page (client or employee) */
export function DetailSkeleton() {
  return (
    <View style={skStyles.detailContainer}>
      <View style={skStyles.detailHeader}>
        <SkeletonBlock width={80} height={80} borderRadius={40} />
        <SkeletonBlock width="50%" height={20} style={{ marginTop: 16 }} />
        <SkeletonBlock width={80} height={28} borderRadius={14} style={{ marginTop: 10 }} />
      </View>
      <View style={skStyles.detailCard}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={skStyles.detailRow}>
            <SkeletonBlock width={36} height={36} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBlock width="30%" height={12} />
              <SkeletonBlock width="60%" height={15} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Skeleton for dashboard stats cards */
export function DashboardSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <SkeletonBlock width="100%" height={140} borderRadius={12} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <SkeletonBlock width="48%" height={100} borderRadius={12} />
        <SkeletonBlock width="48%" height={100} borderRadius={12} />
      </View>
      <SkeletonBlock width="100%" height={120} borderRadius={12} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={100} borderRadius={12} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardText: {
    flex: 1,
    marginLeft: 12,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notifText: {
    flex: 1,
    marginLeft: 14,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  detailHeader: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  taskDot: {
    width: 24,
    alignItems: 'center',
    paddingTop: 14,
  },
  taskCard: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  invoiceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
});

/** Skeleton for task cards in the employee detail page */
export function TaskSkeleton() {
  return (
    <View style={skStyles.taskRow}>
      <View style={skStyles.taskDot}>
        <SkeletonBlock width={12} height={12} borderRadius={6} />
      </View>
      <View style={skStyles.taskCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonBlock width={32} height={32} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <SkeletonBlock width="70%" height={14} />
            <SkeletonBlock width={80} height={22} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function TaskListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </View>
  );
}

/** Skeleton for invoice cards */
export function InvoiceSkeleton() {
  return (
    <View style={skStyles.invoiceCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock width="50%" height={16} />
          <SkeletonBlock width="70%" height={12} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBlock width={60} height={24} borderRadius={8} />
      </View>
      <View style={skStyles.invoiceDetails}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <SkeletonBlock width="60%" height={10} />
          <SkeletonBlock width="80%" height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <SkeletonBlock width="60%" height={10} />
          <SkeletonBlock width="80%" height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <SkeletonBlock width="60%" height={10} />
          <SkeletonBlock width="80%" height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

export function InvoiceListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <InvoiceSkeleton key={i} />
      ))}
    </View>
  );
}

export default SkeletonBlock;
