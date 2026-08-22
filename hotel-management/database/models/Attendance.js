// database/models/Attendance.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class AttendanceModel extends Model {
  static table = 'attendance';

  @field('employee_id') employeeId;
  @field('employee_name') employeeName;
  @field('date') date; // ISO date string
  @field('check_in_time') checkInTime;
  @field('check_out_time') checkOutTime;
  @field('status') status; // PRESENT, ABSENT, LATE, etc.
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;
}
