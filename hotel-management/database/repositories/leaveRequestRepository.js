// database/repositories/leaveRequestRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const LeaveRequestRepository = {
  async findAll() {
    return await database.get('leave_requests')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('leave_requests')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findByEmployee(employeeId) {
    return await database.get('leave_requests')
      .query(Q.where('employee_id', employeeId))
      .fetch();
  },

  async findByStatus(status) {
    return await database.get('leave_requests')
      .query(Q.where('status', status))
      .fetch();
  },

  async create(leaveData) {
    return await database.write(async () => {
      return await database.get('leave_requests').create(record => {
        record.employeeId = leaveData.employee_id;
        record.employeeName = leaveData.employee_name || '';
        record.leaveType = leaveData.leave_type;
        record.startDate = leaveData.start_date;
        record.endDate = leaveData.end_date;
        record.reason = leaveData.reason || '';
        record.status = leaveData.status || 'PENDING';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('leave_requests').find(id);
      await record.update(record => {
        if (updates.status !== undefined) record.status = updates.status;
        if (updates.reason !== undefined) record.reason = updates.reason;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async approve(id) {
    return await this.update(id, { status: 'APPROVED' });
  },

  async reject(id, reason) {
    return await this.update(id, { status: 'REJECTED', reason });
  },

  async getUnsynced() {
    return await database.get('leave_requests')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('leave_requests').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('leave_requests').find(id);
      await record.markAsDeleted();
    });
  },
};
