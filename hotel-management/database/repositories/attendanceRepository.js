// database/repositories/attendanceRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const AttendanceRepository = {
  async findAll() {
    return await database.get('attendance')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('attendance')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findByEmployee(employeeId) {
    return await database.get('attendance')
      .query(Q.where('employee_id', employeeId))
      .fetch();
  },

  async findByDate(date) {
    return await database.get('attendance')
      .query(Q.where('date', date))
      .fetch();
  },

  async findByEmployeeAndDate(employeeId, date) {
    return await database.get('attendance')
      .query(
        Q.where('employee_id', employeeId),
        Q.where('date', date)
      )
      .fetch();
  },

  async create(attendanceData) {
    return await database.write(async () => {
      return await database.get('attendance').create(record => {
        record.employeeId = attendanceData.employee_id;
        record.employeeName = attendanceData.employee_name || '';
        record.date = attendanceData.date;
        record.checkInTime = attendanceData.check_in_time || null;
        record.checkOutTime = attendanceData.check_out_time || null;
        record.status = attendanceData.status || 'PRESENT';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('attendance').find(id);
      await record.update(record => {
        if (updates.check_in_time !== undefined) record.checkInTime = updates.check_in_time;
        if (updates.check_out_time !== undefined) record.checkOutTime = updates.check_out_time;
        if (updates.status !== undefined) record.status = updates.status;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async checkIn(employeeId, employeeName, time) {
    return await database.write(async () => {
      return await database.get('attendance').create(record => {
        record.employeeId = employeeId;
        record.employeeName = employeeName;
        record.date = new Date().toISOString().split('T')[0];
        record.checkInTime = time;
        record.status = 'PRESENT';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async checkOut(employeeId, time) {
    return await database.write(async () => {
      const today = new Date().toISOString().split('T')[0];
      const records = await database.get('attendance')
        .query(
          Q.where('employee_id', employeeId),
          Q.where('date', today)
        )
        .fetch();
      
      if (records.length > 0) {
        await records[0].update(record => {
          record.checkOutTime = time;
          record.updatedAt = Date.now();
          record.synced = false;
        });
        return records[0];
      }
      return null;
    });
  },

  async getUnsynced() {
    return await database.get('attendance')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('attendance').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('attendance').find(id);
      await record.markAsDeleted();
    });
  },
};
