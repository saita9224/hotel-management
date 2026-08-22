// database/models/SalaryRecord.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class SalaryRecordModel extends Model {
  static table = 'salary_records';

  @field('employee_id') employeeId;
  @field('employee_name') employeeName;
  @field('month') month;
  @field('year') year;
  @field('basic_salary') basicSalary;
  @field('allowances') allowances;
  @field('deductions') deductions;
  @field('net_salary') netSalary;
  @field('status') status; // DRAFT, APPROVED, PAID
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;
}
