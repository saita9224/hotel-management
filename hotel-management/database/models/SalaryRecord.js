// database/models/SalaryRecord.js
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class SalaryRecordModel extends Model {
  static table = 'salary_records';

  @field('employee_id')   employeeId;
  @field('employee_name') employeeName;
  @field('month')         month;
  @field('year')          year;
  @field('basic_salary')  basicSalary;
  @field('allowances')    allowances;
  @field('deductions')    deductions;
  @field('net_salary')    netSalary;
  @field('status')        status; // DRAFT, APPROVED, PAID
  @field('created_at')    createdAtMs;  // stored as Unix timestamp (number)
  get createdAt() { return new Date(this.createdAtMs); }
  @field('updated_at')    updatedAtMs;
  get updatedAt() { return new Date(this.updatedAtMs); }
  @field('synced')        synced;
}
