// database/init.js
/**
 * Database initialization and verification utilities
 */

import { database } from './index';
import { SyncQueue } from './syncQueue';
import { ProductRepository } from './repositories/productRepository';
import { ReceiptRepository } from './repositories/receiptRepository';
import { ExpenseRepository } from './repositories/expenseRepository';
import { EmployeeRepository } from './repositories/employeeRepository';
import { AttendanceRepository } from './repositories/attendanceRepository';
import { LeaveRequestRepository } from './repositories/leaveRequestRepository';
import { SalaryRecordRepository } from './repositories/salaryRecordRepository';

export async function initializeDatabase() {
  console.log('Initializing WatermelonDB...');
  
  try {
    // Database is already initialized in index.js
    // Just verify it's ready
    if (!database) {
      throw new Error('Database not initialized');
    }
    
    console.log('✓ Database ready');
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyDatabaseSetup() {
  console.log('Verifying database setup...');
  
  const checks = {
    database: false,
    tables: {},
    repositories: {}
  };

  try {
    // Check database
    checks.database = !!database;
    console.log(`Database: ${checks.database ? '✓' : '✗'}`);

    // Check tables by attempting basic operations
    try {
      await SyncQueue.getCount();
      checks.tables.mutation_queue = true;
      console.log('Table mutation_queue: ✓');
    } catch (e) {
      checks.tables.mutation_queue = false;
      console.log('Table mutation_queue: ✗');
    }

    try {
      await ProductRepository.findAll();
      checks.tables.products = true;
      console.log('Table products: ✓');
    } catch (e) {
      checks.tables.products = false;
      console.log('Table products: ✗');
    }

    try {
      await ReceiptRepository.findAll();
      checks.tables.receipts = true;
      console.log('Table receipts: ✓');
    } catch (e) {
      checks.tables.receipts = false;
      console.log('Table receipts: ✗');
    }

    try {
      await ExpenseRepository.findAll();
      checks.tables.expenses = true;
      console.log('Table expenses: ✓');
    } catch (e) {
      checks.tables.expenses = false;
      console.log('Table expenses: ✗');
    }

    try {
      await EmployeeRepository.findAll();
      checks.tables.employees = true;
      console.log('Table employees: ✓');
    } catch (e) {
      checks.tables.employees = false;
      console.log('Table employees: ✗');
    }

    try {
      await AttendanceRepository.findAll();
      checks.tables.attendance = true;
      console.log('Table attendance: ✓');
    } catch (e) {
      checks.tables.attendance = false;
      console.log('Table attendance: ✗');
    }

    try {
      await LeaveRequestRepository.findAll();
      checks.tables.leave_requests = true;
      console.log('Table leave_requests: ✓');
    } catch (e) {
      checks.tables.leave_requests = false;
      console.log('Table leave_requests: ✗');
    }

    try {
      await SalaryRecordRepository.findAll();
      checks.tables.salary_records = true;
      console.log('Table salary_records: ✓');
    } catch (e) {
      checks.tables.salary_records = false;
      console.log('Table salary_records: ✗');
    }

    // Check repositories
    checks.repositories.product = !!ProductRepository;
    checks.repositories.receipt = !!ReceiptRepository;
    checks.repositories.expense = !!ExpenseRepository;
    checks.repositories.employee = !!EmployeeRepository;
    checks.repositories.attendance = !!AttendanceRepository;
    checks.repositories.leaveRequest = !!LeaveRequestRepository;
    checks.repositories.salaryRecord = !!SalaryRecordRepository;
    checks.repositories.syncQueue = !!SyncQueue;

    console.log('\nRepositories:');
    Object.entries(checks.repositories).forEach(([name, exists]) => {
      console.log(`${name}: ${exists ? '✓' : '✗'}`);
    });

    const allChecks = [
      checks.database,
      ...Object.values(checks.tables),
      ...Object.values(checks.repositories)
    ];

    const allPassed = allChecks.every(check => check);
    
    console.log(`\n${allPassed ? '✓ All checks passed' : '✗ Some checks failed'}`);
    
    return { success: allPassed, checks };

  } catch (error) {
    console.error('Verification failed:', error);
    return { success: false, error: error.message, checks };
  }
}

export async function getDatabaseStats() {
  console.log('Getting database statistics...');
  
  try {
    const stats = {
      mutationQueue: await SyncQueue.getCount(),
      products: (await ProductRepository.findAll()).length,
      receipts: (await ReceiptRepository.findAll()).length,
      expenses: (await ExpenseRepository.findAll()).length,
      employees: (await EmployeeRepository.findAll()).length,
      attendance: (await AttendanceRepository.findAll()).length,
      leaveRequests: (await LeaveRequestRepository.findAll()).length,
      salaryRecords: (await SalaryRecordRepository.findAll()).length,
    };

    console.log('Database Statistics:');
    console.log(`- Mutation Queue Items: ${stats.mutationQueue}`);
    console.log(`- Products: ${stats.products}`);
    console.log(`- Receipts: ${stats.receipts}`);
    console.log(`- Expenses: ${stats.expenses}`);
    console.log(`- Employees: ${stats.employees}`);
    console.log(`- Attendance Records: ${stats.attendance}`);
    console.log(`- Leave Requests: ${stats.leaveRequests}`);
    console.log(`- Salary Records: ${stats.salaryRecords}`);

    return { success: true, stats };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { success: false, error: error.message };
  }
}
