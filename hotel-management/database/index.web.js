import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { schemaMigrations, createTable } from "@nozbe/watermelondb/Schema/migrations";

import schema from "./schema";
import { ProductModel } from "./models/Product";
import { ReceiptModel } from "./models/Receipt";
import { OrderModel } from "./models/Order";
import { OrderItemModel } from "./models/OrderItem";
import { ExpenseModel } from "./models/Expense";
import { EmployeeModel } from "./models/Employee";
import { MutationQueueModel } from "./models/MutationQueue";
import { AttendanceModel } from "./models/Attendance";
import { LeaveRequestModel } from "./models/LeaveRequest";
import { SalaryRecordModel } from "./models/SalaryRecord";
import { PnL } from "./models/PnL";
import { Balance } from "./models/Balance";
import { Aging } from "./models/Aging";
import { BusinessInfo } from "./models/BusinessInfo";

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

const adapter = new LokiJSAdapter({
  schema,
  migrations,
  dbName: "hotel-management",
  useWebWorker: false,
  useIncrementalIndexedDB: true,
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
    Aging,
    BusinessInfo,
  ],
});

export default database;
