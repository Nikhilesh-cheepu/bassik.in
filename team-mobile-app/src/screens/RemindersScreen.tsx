/**
 * Reminders Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { remindersApi } from '../api/reminders';
import type { TeamReminder } from '../types/team';

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<TeamReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reminderText, setReminderText] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      const data = await remindersApi.getReminders();
      setReminders(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load reminders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReminders();
  };

  const handleAddReminder = () => {
    setReminderText('');
    setModalVisible(true);
  };

  const handleSaveReminder = async () => {
    if (!reminderText.trim()) {
      Alert.alert('Error', 'Please enter reminder text');
      return;
    }

    try {
      await remindersApi.createReminder({ text: reminderText });
      setModalVisible(false);
      loadReminders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create reminder');
    }
  };

  const handleToggleComplete = async (reminder: TeamReminder) => {
    try {
      if (reminder.completedAt) {
        await remindersApi.uncompleteReminder(reminder.id);
      } else {
        await remindersApi.completeReminder(reminder.id);
      }
      loadReminders();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = (reminder: TeamReminder) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remindersApi.deleteReminder(reminder.id);
              loadReminders();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete reminder');
            }
          },
        },
      ]
    );
  };

  const renderReminder = ({ item }: { item: TeamReminder }) => (
    <View style={styles.reminderCard}>
      <TouchableOpacity
        style={styles.reminderContent}
        onPress={() => handleToggleComplete(item)}
      >
        <Ionicons
          name={item.completedAt ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.completedAt ? '#34C759' : '#999'}
          style={styles.checkbox}
        />
        <Text
          style={[
            styles.reminderText,
            item.completedAt && styles.reminderTextCompleted,
          ]}
        >
          {item.text}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReminder(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        renderItem={renderReminder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alarm-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No reminders yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create a reminder
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddReminder}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TouchableOpacity onPress={handleSaveReminder}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              value={reminderText}
              onChangeText={setReminderText}
              placeholder="What do you want to remember?"
              placeholderTextColor="#999"
              multiline
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  reminderCard: {
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
  reminderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
  },
  reminderText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  reminderTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
