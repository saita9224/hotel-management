// components/OfflineIndicator.jsx
/**
 * Reusable offline indicator component
 * Can be placed at the top or bottom of any screen
 * Shows current network status and pending sync count
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOffline } from '../context/OfflineContext';

export default function OfflineIndicator({ position = 'top' }) {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  // Don't show anything if online with no pending items
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const getBackgroundColor = () => {
    if (!isOnline) return '#FFF3CD'; // Warning yellow
    if (isSyncing) return '#CCE5FF';  // Info blue
    return '#D4EDDA';                 // Success green
  };

  const getTextColor = () => {
    if (!isOnline) return '#856404';
    if (isSyncing) return '#004085';
    return '#155724';
  };

  const getStatusText = () => {
    if (!isOnline) {
      return `⚠️ Offline — ${pendingCount} pending sync`;
    }
    if (isSyncing) {
      return `🔄 Syncing ${pendingCount} items...`;
    }
    return `✅ Online (${pendingCount} pending)`;
  };

  const containerStyle = position === 'top' 
    ? styles.topContainer 
    : styles.bottomContainer;

  return (
    <View style={[containerStyle, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        {isSyncing && (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
            style={{ marginRight: 8 }} 
          />
        )}
        <Text style={[styles.text, { color: getTextColor() }]}>
          {getStatusText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  bottomContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
