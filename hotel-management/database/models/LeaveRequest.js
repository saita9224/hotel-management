// database/models/LeaveRequest.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class LeaveRequestModel extends Model {
  static table = 'leave_requests';

  @field('employee_id') employeeId;
  @field('employee_name') employeeName;
  @field('leave_type') leaveType;
  @field('start_date') startDate;
  @field('end_date') endDate;
  @field('reason') reason;
  @field('status') status; // PENDING, APPROVED, REJECTED
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;
}
