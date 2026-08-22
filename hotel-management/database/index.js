// database/index.js
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import { ProductModel } from './models/Product';
import { ReceiptModel } from './models/Receipt';
import { OrderModel } from './models/Order';
import { OrderItemModel } from './models/OrderItem';
import { ExpenseModel } from './models/Expense';
import { EmployeeModel } from './models/Employee';
import { MutationQueueModel } from './models/MutationQueue';
import { AttendanceModel } from './models/Attendance';
import { LeaveRequestModel } from './models/LeaveRequest';
import { SalaryRecordModel } from './models/SalaryRecord';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Enable JSI for better performance
});

export const database = new Database({
  adapter,
  modelClasses: [
    ProductModel,
    ReceiptModel,
    OrderModel,
    OrderItemModel,
    ExpenseModel,
    EmployeeModel,
    MutationQueueModel,
    AttendanceModel,
    LeaveRequestModel,
    SalaryRecordModel,
  ],
});

export default database;
