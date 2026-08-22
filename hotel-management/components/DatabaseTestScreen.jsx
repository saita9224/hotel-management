// components/DatabaseTestScreen.jsx
/**
 * Test screen to verify WatermelonDB functionality
 * Add this to your app temporarily to test the database
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { testWatermelonDB } from '../scripts/testWatermelonDB';
import { migrateFromAsyncStorage } from '../scripts/migrateToWatermelon';
import { verifyDatabaseSetup, getDatabaseStats } from '../database/init';

export default function DatabaseTestScreen() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setResults(null);
    try {
      const testResults = await testWatermelonDB();
      setResults(testResults);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  const runMigration = async () => {
    setLoading(true);
    try {
      const migrationResult = await migrateFromAsyncStorage();
      setResults(migrationResult);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  const verifySetup = async () => {
    setLoading(true);
    try {
      const verificationResult = await verifyDatabaseSetup();
      setResults(verificationResult);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  const getStats = async () => {
    setLoading(true);
    try {
      const statsResult = await getDatabaseStats();
      setStats(statsResult.stats);
      setResults(statsResult);
    } catch (error) {
      setResults({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WatermelonDB Test Suite</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={verifySetup}>
          <Text style={styles.buttonText}>Verify Setup</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runTests}>
          <Text style={styles.buttonText}>Run Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runMigration}>
          <Text style={styles.buttonText}>Migrate Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={getStats}>
          <Text style={styles.buttonText}>Get Stats</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {stats && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Database Statistics</Text>
          <Text style={styles.resultText}>Mutation Queue: {stats.mutationQueue}</Text>
          <Text style={styles.resultText}>Products: {stats.products}</Text>
          <Text style={styles.resultText}>Receipts: {stats.receipts}</Text>
          <Text style={styles.resultText}>Expenses: {stats.expenses}</Text>
          <Text style={styles.resultText}>Employees: {stats.employees}</Text>
          <Text style={styles.resultText}>Attendance Records: {stats.attendance}</Text>
          <Text style={styles.resultText}>Leave Requests: {stats.leaveRequests}</Text>
          <Text style={styles.resultText}>Salary Records: {stats.salaryRecords}</Text>
        </View>
      )}

      {results && (
        <ScrollView style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Results</Text>
          {results.error ? (
            <Text style={styles.errorText}>Error: {results.error}</Text>
          ) : results.tests ? (
            results.tests.map((test, index) => (
              <View key={index} style={styles.testItem}>
                <Text style={[
                  styles.testStatus,
                  test.status === 'PASSED' ? styles.passed : styles.failed
                ]}>
                  {test.status === 'PASSED' ? '✓' : '✗'}
                </Text>
                <Text style={styles.testName}>{test.name}</Text>
                {test.error && (
                  <Text style={styles.errorText}>{test.error}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.resultText}>
              {results.message || JSON.stringify(results, null, 2)}
            </Text>
          )}
          
          {results.passed !== undefined && (
            <Text style={styles.summaryText}>
              Passed: {results.passed} | Failed: {results.failed}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testStatus: {
    fontSize: 18,
    marginRight: 10,
    fontWeight: 'bold',
  },
  passed: {
    color: 'green',
  },
  failed: {
    color: 'red',
  },
  testName: {
    fontSize: 14,
    flex: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
});
