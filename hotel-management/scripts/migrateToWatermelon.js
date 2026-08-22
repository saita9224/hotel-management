// scripts/migrateToWatermelon.js
/**
 * Migration script to convert AsyncStorage data to WatermelonDB
 * Run this once after upgrading to WatermelonDB
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database';
import { SyncQueue } from '../database/syncQueue';
import { ProductRepository } from '../database/repositories/productRepository';
import { ReceiptRepository } from '../database/repositories/receiptRepository';
import { ExpenseRepository } from '../database/repositories/expenseRepository';

export async function migrateFromAsyncStorage() {
  console.log('Starting migration from AsyncStorage to WatermelonDB...');
  
  try {
    // 1. Migrate offline queue
    const oldQueueData = await AsyncStorage.getItem('@pos_offline_queue_v1');
    if (oldQueueData) {
      const oldQueue = JSON.parse(oldQueueData);
      console.log(`Migrating ${oldQueue.length} queue items...`);
      
      for (const item of oldQueue) {
        await database.write(async () => {
          await database.get('mutation_queue').create(record => {
            record.clientId = item.clientId;
            record.mutationType = item.mutationType;
            record.payload = JSON.stringify(item.payload);
            record.status = item.status;
            record.createdAt = item.createdAt;
            record.error = item.error || null;
          });
        });
      }
      
      // Clear old queue after successful migration
      await AsyncStorage.removeItem('@pos_offline_queue_v1');
      console.log('Queue migration completed');
    } else {
      console.log('No existing queue data found');
    }

    // 2. Migrate auth session (keep in AsyncStorage, just log it)
    const sessionData = await AsyncStorage.getItem('auth_session');
    if (sessionData) {
      console.log('Auth session data preserved in AsyncStorage');
    }

    // 3. Migrate any other relevant AsyncStorage data
    // Add migrations for other data types as needed
    
    console.log('Migration completed successfully!');
    return { success: true, message: 'Migration completed' };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

export async function rollbackMigration() {
  console.log('Starting rollback to AsyncStorage...');
  
  try {
    // 1. Export WatermelonDB queue data
    const mutations = await database.get('mutation_queue').query().fetch();
    
    if (mutations.length > 0) {
      const oldQueue = mutations.map(m => ({
        id: m.id,
        clientId: m.clientId,
        mutationType: m.mutationType,
        payload: JSON.parse(m.payload),
        createdAt: m.createdAt,
        status: m.status,
        error: m.error,
      }));
      
      // 2. Save to AsyncStorage
      await AsyncStorage.setItem('@pos_offline_queue_v1', JSON.stringify(oldQueue));
      
      // 3. Clear WatermelonDB
      await database.write(async () => {
        await database.get('mutation_queue').query().destroyAllPermanently();
      });
      
      console.log('Rollback completed');
    } else {
      console.log('No data to rollback');
    }
    
    return { success: true, message: 'Rollback completed' };
    
  } catch (error) {
    console.error('Rollback failed:', error);
    return { success: false, error: error.message };
  }
}

export async function clearWatermelonDB() {
  console.log('Clearing WatermelonDB...');
  
  try {
    await database.unsafeResetDatabase();
    console.log('Database cleared');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear database:', error);
    return { success: false, error: error.message };
  }
}
