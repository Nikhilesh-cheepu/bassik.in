/**
 * Reports Screen - WhatsApp and Done Reports
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportsApi } from '../api/reports';

const DATE_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

export default function ReportsScreen() {
  const [selectedRange, setSelectedRange] = useState('today');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerateWhatsAppReport = async () => {
    Alert.alert(
      'Generate WhatsApp Report',
      'This will send a report to WhatsApp. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await reportsApi.generateWhatsAppReport({
                dateRange: selectedRange,
              });
              Alert.alert('Success', result.message || 'Report sent successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to generate report');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewDoneReport = async () => {
    setIsLoading(true);
    try {
      const result = await reportsApi.getDoneReport(selectedRange);
      setReportData(result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date Range</Text>
        <View style={styles.rangeButtons}>
          {DATE_RANGES.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.rangeButton,
                selectedRange === range.id && styles.rangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range.id)}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  selectedRange === range.id && styles.rangeButtonTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Actions</Text>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handleGenerateWhatsAppReport}
          disabled={isLoading}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>WhatsApp Report</Text>
            <Text style={styles.actionDescription}>
              Send task summary to WhatsApp
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
          onPress={handleViewDoneReport}
          disabled={isLoading}
        >
          <Ionicons name="stats-chart" size={24} color="#007AFF" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Done Report</Text>
            <Text style={styles.actionDescription}>
              View completed tasks summary
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      )}

      {reportData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Summary</Text>
          <View style={styles.reportCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Completed</Text>
              <Text style={styles.statValue}>{reportData.stats?.total || 0}</Text>
            </View>

            {reportData.stats?.byOutlet && (
              <View style={styles.statsSection}>
                <Text style={styles.statsTitle}>By Outlet</Text>
                {Object.entries(reportData.stats.byOutlet).map(
                  ([outlet, count]) => (
                    <View key={outlet} style={styles.statRow}>
                      <Text style={styles.statLabel}>{outlet}</Text>
                      <Text style={styles.statValue}>{count as number}</Text>
                    </View>
                  )
                )}
              </View>
            )}

            {reportData.stats?.byMember && (
              <View style={styles.statsSection}>
                <Text style={styles.statsTitle}>By Member</Text>
                {Object.entries(reportData.stats.byMember).map(
                  ([member, count]) => (
                    <View key={member} style={styles.statRow}>
                      <Text style={styles.statLabel}>{member}</Text>
                      <Text style={styles.statValue}>{count as number}</Text>
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  rangeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rangeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  rangeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  rangeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
});
