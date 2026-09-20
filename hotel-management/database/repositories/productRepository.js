// database/repositories/productRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

const normalizeWatermelonProduct = (p) => {
  const rawDate = p.createdAt;
  let createdAtStr = new Date().toISOString();
  if (rawDate) {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      createdAtStr = d.toISOString();
    }
  }

  return {
    id: p.id,
    name: p.name || "",
    category: p.categoryId ? { id: p.categoryId, name: "" } : null,
    unit: p.unit || "",
    current_stock: Number(p.currentStock ?? 0),
    auto_deduct_on_sale: Boolean(p.autoDeductOnSale),
    created_at: createdAtStr,
  };
};

export const ProductRepository = {
  async findAll() {
    const records = await database.get('products')
      .query()
      .fetch();
    return records.map(normalizeWatermelonProduct);
  },

  async findById(id) {
    try {
      const record = await database.get('products').find(id);
      return record ? normalizeWatermelonProduct(record) : null;
    } catch (error) {
      return null;
    }
  },

  async findByCategory(categoryId) {
    const records = await database.get('products')
      .query(Q.where('category_id', categoryId))
      .fetch();
    return records.map(normalizeWatermelonProduct);
  },

  async create(productData) {
    const createdDate = productData.created_at
      ? new Date(productData.created_at).getTime()
      : Date.now();

    const record = await database.write(async () => {
      return await database.get('products').create(record => {
        if (productData.id) record._raw.id = String(productData.id);
        record.name = productData.name;
        record.categoryId = productData.category_id || productData.categoryId || null;
        record.unit = productData.unit || '';
        record.currentStock = Number(productData.current_stock ?? productData.currentStock ?? 0);
        record.autoDeductOnSale = Boolean(productData.auto_deduct_on_sale ?? productData.autoDeductOnSale ?? false);
        record.createdAt = isNaN(createdDate) ? Date.now() : createdDate;
        record.updatedAt = Date.now();
        record.synced = Boolean(productData.synced ?? false);
      });
    });
    return normalizeWatermelonProduct(record);
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(r => {
        if (updates.name !== undefined) r.name = updates.name;
        if (updates.category_id !== undefined || updates.categoryId !== undefined) {
          r.categoryId = updates.category_id || updates.categoryId;
        }
        if (updates.unit !== undefined) r.unit = updates.unit;
        if (updates.current_stock !== undefined || updates.currentStock !== undefined) {
          r.currentStock = Number(updates.current_stock ?? updates.currentStock);
        }
        if (updates.auto_deduct_on_sale !== undefined || updates.autoDeductOnSale !== undefined) {
          r.autoDeductOnSale = Boolean(updates.auto_deduct_on_sale ?? updates.autoDeductOnSale);
        }
        r.updatedAt = Date.now();
        if (updates.synced !== undefined) r.synced = Boolean(updates.synced);
      });
      return normalizeWatermelonProduct(record);
    });
  },

  async updateStock(id, quantityChange) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(r => {
        r.currentStock = Math.max(0, r.currentStock + quantityChange);
        r.updatedAt = Date.now();
        r.synced = false;
      });
      return normalizeWatermelonProduct(record);
    });
  },

  async getUnsynced() {
    const records = await database.get('products')
      .query(Q.where('synced', false))
      .fetch();
    return records.map(normalizeWatermelonProduct);
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('products').find(id);
      await record.update(r => {
        r.synced = true;
      });
      return normalizeWatermelonProduct(record);
    });
  },

  async delete(id) {
    return await database.write(async () => {
      try {
        const record = await database.get('products').find(id);
        if (record) {
          await record.destroyPermanently();
        }
      } catch (error) {
        // Record may already be deleted
      }
    });
  },
};
