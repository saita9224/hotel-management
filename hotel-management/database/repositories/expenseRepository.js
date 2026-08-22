// database/repositories/expenseRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

const normalizeWatermelonExpense = (e) => {
  const rawDate = e.createdAt;
  let createdAtStr = new Date().toISOString();
  if (rawDate) {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      createdAtStr = d.toISOString();
    }
  }

  return {
    id: e.id,
    supplier_id: null,
    supplier_name: e.supplierName || "",
    product_id: null,
    product_name: e.itemName || "",
    item_name: e.itemName || "",
    quantity: Number(e.quantity ?? 0),
    unit_price: Number(e.unitPrice ?? 0),
    total_price: Number(e.totalPrice ?? 0),
    amount_paid: Number(e.amountPaid ?? 0),
    balance: Number(e.balance ?? 0),
    is_fully_paid: Boolean(e.isFullyPaid),
    created_at: createdAtStr,
  };
};

export const ExpenseRepository = {
  async findAll() {
    const records = await database.get('expenses')
      .query()
      .fetch();
    return records.map(normalizeWatermelonExpense);
  },

  async findById(id) {
    try {
      const record = await database.get('expenses').find(id);
      return record ? normalizeWatermelonExpense(record) : null;
    } catch (error) {
      return null;
    }
  },

  async findBySupplier(supplierName) {
    const records = await database.get('expenses')
      .query(Q.where('supplier_name', supplierName))
      .fetch();
    return records.map(normalizeWatermelonExpense);
  },

  async create(expenseData) {
    const createdDate = expenseData.created_at
      ? new Date(expenseData.created_at).getTime()
      : Date.now();

    const record = await database.write(async () => {
      return await database.get('expenses').create(record => {
        if (expenseData.id) record._raw.id = String(expenseData.id);
        record.itemName = expenseData.item_name || expenseData.itemName || '';
        record.quantity = Number(expenseData.quantity ?? 0);
        record.unitPrice = Number(expenseData.unit_price ?? expenseData.unitPrice ?? 0);
        record.totalPrice = Number(expenseData.total_price ?? expenseData.totalPrice ?? 0);
        record.amountPaid = Number(expenseData.amount_paid ?? expenseData.amountPaid ?? 0);
        record.balance = Number(expenseData.balance ?? 0);
        record.isFullyPaid = Boolean(expenseData.is_fully_paid ?? expenseData.isFullyPaid ?? false);
        record.supplierName = expenseData.supplier_name || expenseData.supplierName || '';
        record.createdAt = isNaN(createdDate) ? Date.now() : createdDate;
        record.updatedAt = Date.now();
        record.synced = Boolean(expenseData.synced ?? false);
      });
    });
    return normalizeWatermelonExpense(record);
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(r => {
        if (updates.item_name !== undefined || updates.itemName !== undefined) {
          r.itemName = updates.item_name || updates.itemName;
        }
        if (updates.quantity !== undefined) r.quantity = Number(updates.quantity);
        if (updates.unit_price !== undefined || updates.unitPrice !== undefined) {
          r.unitPrice = Number(updates.unit_price ?? updates.unitPrice);
        }
        if (updates.total_price !== undefined || updates.totalPrice !== undefined) {
          r.totalPrice = Number(updates.total_price ?? updates.totalPrice);
        }
        if (updates.amount_paid !== undefined || updates.amountPaid !== undefined) {
          r.amountPaid = Number(updates.amount_paid ?? updates.amountPaid);
        }
        if (updates.balance !== undefined) r.balance = Number(updates.balance);
        if (updates.is_fully_paid !== undefined || updates.isFullyPaid !== undefined) {
          r.isFullyPaid = Boolean(updates.is_fully_paid ?? updates.isFullyPaid);
        }
        if (updates.supplier_name !== undefined || updates.supplierName !== undefined) {
          r.supplierName = updates.supplier_name || updates.supplierName;
        }
        r.updatedAt = Date.now();
        if (updates.synced !== undefined) r.synced = Boolean(updates.synced);
      });
      return normalizeWatermelonExpense(record);
    });
  },

  async updatePayment(id, paymentAmount) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(r => {
        r.amountPaid = r.amountPaid + paymentAmount;
        r.balance = Math.max(0, r.balance - paymentAmount);
        r.isFullyPaid = r.balance <= 0;
        r.updatedAt = Date.now();
        r.synced = false;
      });
      return normalizeWatermelonExpense(record);
    });
  },

  async getUnsynced() {
    const records = await database.get('expenses')
      .query(Q.where('synced', false))
      .fetch();
    return records.map(normalizeWatermelonExpense);
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.update(r => {
        r.synced = true;
      });
      return normalizeWatermelonExpense(record);
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('expenses').find(id);
      await record.markAsDeleted();
    });
  },
};
