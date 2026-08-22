// database/repositories/productRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const ProductRepository = {
  async findAll() {
    return await database.get('products')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('products')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findByCategory(categoryId) {
    return await database.get('products')
      .query(Q.where('category_id', categoryId))
      .fetch();
  },

  async create(productData) {
    return await database.write(async () => {
      return await database.get('products').create(record => {
        record.name = productData.name;
        record.categoryId = productData.category_id || null;
        record.unit = productData.unit || '';
        record.currentStock = productData.current_stock || 0;
        record.autoDeductOnSale = productData.auto_deduct_on_sale || false;
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(record => {
        if (updates.name !== undefined) record.name = updates.name;
        if (updates.category_id !== undefined) record.categoryId = updates.category_id;
        if (updates.unit !== undefined) record.unit = updates.unit;
        if (updates.current_stock !== undefined) record.currentStock = updates.current_stock;
        if (updates.auto_deduct_on_sale !== undefined) record.autoDeductOnSale = updates.auto_deduct_on_sale;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async updateStock(id, quantityChange) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(record => {
        record.currentStock = Math.max(0, record.currentStock + quantityChange);
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async getUnsynced() {
    return await database.get('products')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.markAsDeleted();
    });
  },
};
