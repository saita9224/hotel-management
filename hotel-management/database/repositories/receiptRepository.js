// database/repositories/receiptRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const ReceiptRepository = {
  async findAll() {
    return await database.get('receipts')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('receipts')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findBySession(sessionId) {
    return await database.get('receipts')
      .query(Q.where('session_id', sessionId))
      .fetch();
  },

  async findByStatus(status) {
    return await database.get('receipts')
      .query(Q.where('status', status))
      .fetch();
  },

  async create(receiptData) {
    return await database.write(async () => {
      return await database.get('receipts').create(record => {
        if (receiptData.id) record._raw.id = String(receiptData.id);
        record.sessionId = receiptData.session_id;
        record.receiptNumber = receiptData.receipt_number || `R-${Date.now()}`;
        record.subtotal = receiptData.subtotal || 0;
        record.discount = receiptData.discount || 0;
        record.total = receiptData.total || 0;
        record.balance = receiptData.balance || 0;
        record.status = receiptData.status || 'OPEN';
        record.tableNote = receiptData.table_note || '';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = Boolean(receiptData.synced ?? false);
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('receipts').find(id);
      await record.update(record => {
        if (updates.status !== undefined) record.status = updates.status;
        if (updates.subtotal !== undefined) record.subtotal = updates.subtotal;
        if (updates.discount !== undefined) record.discount = updates.discount;
        if (updates.total !== undefined) record.total = updates.total;
        if (updates.balance !== undefined) record.balance = updates.balance;
        if (updates.table_note !== undefined) record.tableNote = updates.table_note;
        record.updatedAt = Date.now();
        record.synced = updates.synced !== undefined ? Boolean(updates.synced) : false;
      });
      return record;
    });
  },

  async getUnsynced() {
    return await database.get('receipts')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('receipts').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('receipts').find(id);
      await record.markAsDeleted();
    });
  },
};
