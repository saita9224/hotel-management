// database/repositories/salaryRecordRepository.js
import { Q } from '@nozbe/watermelondb';
import { database } from '../index';

export const SalaryRecordRepository = {
  async findAll() {
    return await database.get('salary_records')
      .query()
      .fetch();
  },

  async findById(id) {
    try {
      return await database.get('salary_records')
        .find(id);
    } catch (error) {
      return null;
    }
  },

  async findByEmployee(employeeId) {
    return await database.get('salary_records')
      .query(Q.where('employee_id', employeeId))
      .fetch();
  },

  async findByMonthYear(month, year) {
    return await database.get('salary_records')
      .query(
        Q.where('month', month),
        Q.where('year', year)
      )
      .fetch();
  },

  async findByEmployeeAndMonthYear(employeeId, month, year) {
    return await database.get('salary_records')
      .query(
        Q.where('employee_id', employeeId),
        Q.where('month', month),
        Q.where('year', year)
      )
      .fetch();
  },

  async create(salaryData) {
    return await database.write(async () => {
      return await database.get('salary_records').create(record => {
        record.employeeId = salaryData.employee_id;
        record.employeeName = salaryData.employee_name || '';
        record.month = salaryData.month;
        record.year = salaryData.year;
        record.basicSalary = salaryData.basic_salary || 0;
        record.allowances = salaryData.allowances || 0;
        record.deductions = salaryData.deductions || 0;
        record.netSalary = salaryData.net_salary || 0;
        record.status = salaryData.status || 'DRAFT';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
        record.synced = false;
      });
    });
  },

  async update(id, updates) {
    return await database.write(async () => {
      const record = await database.get('salary_records').find(id);
      await record.update(record => {
        if (updates.basic_salary !== undefined) record.basicSalary = updates.basic_salary;
        if (updates.allowances !== undefined) record.allowances = updates.allowances;
        if (updates.deductions !== undefined) record.deductions = updates.deductions;
        if (updates.net_salary !== undefined) record.netSalary = updates.net_salary;
        if (updates.status !== undefined) record.status = updates.status;
        record.updatedAt = Date.now();
        record.synced = false;
      });
      return record;
    });
  },

  async approve(id) {
    return await this.update(id, { status: 'APPROVED' });
  },

  async markAsPaid(id) {
    return await this.update(id, { status: 'PAID' });
  },

  async getUnsynced() {
    return await database.get('salary_records')
      .query(Q.where('synced', false))
      .fetch();
  },

  async markAsSynced(id) {
    return await database.write(async () => {
      const record = await database.get('salary_records').find(id);
      await record.update(record => {
        record.synced = true;
      });
      return record;
    });
  },

  async delete(id) {
    return await database.write(async () => {
      const record = await database.get('salary_records').find(id);
      await record.markAsDeleted();
    });
  },
};
