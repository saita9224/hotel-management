// database/syncQueue.js
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import uuid from 'react-native-uuid';

export const SyncQueue = {
  async enqueue(mutationType, payload) {
    const clientId = String(uuid.v4());
    await database.write(async () => {
      await database.get('mutation_queue').create(record => {
        record.clientId = clientId;
        record.mutationType = mutationType;
        record.payload = JSON.stringify(payload);
        record.status = 'PENDING';
        record.createdAt = Date.now();
        record.error = null;
      });
    });
    return { clientId };
  },

  async getPending() {
    const collection = database.get('mutation_queue');
    return await collection
      .query(Q.where('status', 'PENDING'))
      .fetch();
  },

  async markSyncing(clientIds) {
    await database.write(async () => {
      const records = await database.get('mutation_queue')
        .query(Q.where('client_id', Q.oneOf(clientIds)))
        .fetch();
      
      for (const record of records) {
        await record.update(record => {
          record.status = 'SYNCING';
        });
      }
    });
  },

  async resetToPending(clientIds) {
    await database.write(async () => {
      const records = await database.get('mutation_queue')
        .query(Q.where('client_id', Q.oneOf(clientIds)))
        .fetch();
      
      for (const record of records) {
        await record.update(record => {
          record.status = 'PENDING';
        });
      }
    });
  },

  async removeSucceeded(clientIds) {
    await database.write(async () => {
      const records = await database.get('mutation_queue')
        .query(Q.where('client_id', Q.oneOf(clientIds)))
        .fetch();
      
      for (const record of records) {
        await record.markAsDeleted(); // Soft delete
      }
    });
  },

  async markFailed(clientId, error) {
    await database.write(async () => {
      const record = await database.get('mutation_queue')
        .query(Q.where('client_id', clientId))
        .fetch();
      
      if (record.length > 0) {
        await record[0].update(record => {
          record.status = 'FAILED';
          record.error = String(error || 'Sync failed');
        });
      }
    });
  },

  async getCount() {
    const collection = database.get('mutation_queue');
    const count = await collection
      .query(Q.where('status', 'PENDING'))
      .fetchCount();
    return count;
  },

  async clearQueue() {
    await database.write(async () => {
      await database.get('mutation_queue')
        .query()
        .destroyAllPermanently();
    });
  },
};
