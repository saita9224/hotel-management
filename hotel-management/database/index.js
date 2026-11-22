// database/index.js
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
import { PnL } from './models/PnL';
import { Balance } from './models/Balance';
import { Aging } from './models/Aging';
import { BusinessInfo } from './models/BusinessInfo';

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'business_info',
          columns: [
            { name: 'schema_name',    type: 'string', isIndexed: true },
            { name: 'name',           type: 'string', isOptional: true },
            { name: 'logo',           type: 'string', isOptional: true },
            { name: 'logo_local_uri', type: 'string', isOptional: true },
            { name: 'logo_pending',   type: 'boolean' },
            { name: 'updated_at',     type: 'number' },
          ],
        }),
      ],
    },
  ],
});

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false, // Set to false to avoid JSI fallback warnings during JS dev bundling
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
    PnL,
    Balance,
    BusinessInfo,
    Aging,
  ],
});

export default database;
