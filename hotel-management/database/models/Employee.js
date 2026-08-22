// database/models/Employee.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class EmployeeModel extends Model {
  static table = 'employees';

  @field('name') name;
  @field('role') role;
  @field('permissions') permissions; // JSON string
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;
}
