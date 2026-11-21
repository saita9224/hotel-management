import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

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

const adapter = new LokiJSAdapter({
  schema,
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
  ],
});

export default database;
