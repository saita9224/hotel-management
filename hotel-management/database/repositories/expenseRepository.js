// database/repositories/expenseRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const ExpenseRepository = {
  async findAll() {
    return await database.get('expenses')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('expenses')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findBySupplier(supplierName) {
    return await database.get('expenses')
      .query(Q.where('supplier_name', supplierName))
      .fetch();
  },

  async create(expenseData) {
    return await database.write(async () => {
      return await database.get('expenses').create(record => {
        record.itemName = expenseData.item_name;
        record.quantity = expenseData.quantity || 0;
        record.unitPrice = expenseData.unit_price || 0;
        record.totalPrice = expenseData.total_price || 0;
        record.amountPaid = expenseData.amount_paid || 0;
        record.balance = expenseData.balance || 0;
        record.isFullyPaid = expenseData.is_fully_paid || false;
        record.supplierName = expenseData.supplier_name || '';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(record => {
        if (updates.item_name !== undefined) record.itemName = updates.item_name;
        if (updates.quantity !== undefined) record.quantity = updates.quantity;
        if (updates.unit_price !== undefined) record.unitPrice = updates.unit_price;
        if (updates.total_price !== undefined) record.totalPrice = updates.total_price;
        if (updates.amount_paid !== undefined) record.amountPaid = updates.amount_paid;
        if (updates.balance !== undefined) record.balance = updates.balance;
        if (updates.is_fully_paid !== undefined) record.isFullyPaid = updates.is_fully_paid;
        if (updates.supplier_name !== undefined) record.supplierName = updates.supplier_name;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async updatePayment(id, paymentAmount) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(record => {
        record.amountPaid = record.amountPaid + paymentAmount;
        record.balance = Math.max(0, record.balance - paymentAmount);
        record.isFullyPaid = record.balance <= 0;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async getUnsynced() {
    return await database.get('expenses')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.markAsDeleted();
    });
  },
};
