// database/repositories/employeeRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const EmployeeRepository = {
  async findAll() {
    return await database.get('employees')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('employees')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findByRole(role) {
    return await database.get('employees')
      .query(Q.where('role', role))
      .fetch();
  },

  async create(employeeData) {
    return await database.write(async () => {
      return await database.get('employees').create(record => {
        record.name = employeeData.name;
        record.role = employeeData.role || 'EMPLOYEE';
        record.permissions = JSON.stringify(employeeData.permissions || []);
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('employees').find(id);
      await record.update(record => {
        if (updates.name !== undefined) record.name = updates.name;
        if (updates.role !== undefined) record.role = updates.role;
        if (updates.permissions !== undefined) record.permissions = JSON.stringify(updates.permissions);
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async getUnsynced() {
    return await database.get('employees')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('employees').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('employees').find(id);
      await record.markAsDeleted();
    });
  },
};
