// database/schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'category_id', type: 'string', isOptional: true },
        { name: 'unit', type: 'string' },
        { name: 'current_stock', type: 'number' },
        { name: 'auto_deduct_on_sale', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'receipts',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'receipt_number', type: 'string' },
        { name: 'subtotal', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'balance', type: 'number' },
        { name: 'status', type: 'string' }, // OPEN, PENDING, PAID, CREDIT
        { name: 'table_note', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'receipt_id', type: 'string', isIndexed: true },
        { name: 'is_saved', type: 'boolean' },
        { name: 'is_refunded', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'order_items',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string' },
        { name: 'product_name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'listed_price', type: 'number' },
        { name: 'final_price', type: 'number' },
        { name: 'line_total', type: 'number' },
        { name: 'price_overridden', type: 'boolean' },
        { name: 'price_override_reason', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'expenses',
      columns: [
        { name: 'item_name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'total_price', type: 'number' },
        { name: 'amount_paid', type: 'number' },
        { name: 'balance', type: 'number' },
        { name: 'is_fully_paid', type: 'boolean' },
        { name: 'supplier_name', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'employees',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'permissions', type: 'string' }, // JSON string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'mutation_queue',
      columns: [
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'mutation_type', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON string
        { name: 'status', type: 'string', isIndexed: true }, // PENDING, SYNCING, FAILED
        { name: 'created_at', type: 'number' },
        { name: 'error', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'attendance',
      columns: [
        { name: 'employee_id', type: 'string', isIndexed: true },
        { name: 'employee_name', type: 'string' },
        { name: 'date', type: 'string' }, // ISO date string
        { name: 'check_in_time', type: 'string', isOptional: true },
        { name: 'check_out_time', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // PRESENT, ABSENT, LATE, etc.
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'leave_requests',
      columns: [
        { name: 'employee_id', type: 'string', isIndexed: true },
        { name: 'employee_name', type: 'string' },
        { name: 'leave_type', type: 'string' },
        { name: 'start_date', type: 'string' },
        { name: 'end_date', type: 'string' },
        { name: 'reason', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // PENDING, APPROVED, REJECTED
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'salary_records',
      columns: [
        { name: 'employee_id', type: 'string', isIndexed: true },
        { name: 'employee_name', type: 'string' },
        { name: 'month', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'basic_salary', type: 'number' },
        { name: 'allowances', type: 'number' },
        { name: 'deductions', type: 'number' },
        { name: 'net_salary', type: 'number' },
        { name: 'status', type: 'string' }, // DRAFT, APPROVED, PAID
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
  ],
});
