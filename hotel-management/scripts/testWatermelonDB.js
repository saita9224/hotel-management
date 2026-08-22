// scripts/testWatermelonDB.js
/**
 * Test script to verify WatermelonDB functionality
 */

import { database } from '../database';
import { SyncQueue } from '../database/syncQueue';
import { ProductRepository } from '../database/repositories/productRepository';
import { ReceiptRepository } from '../database/repositories/receiptRepository';
import { ExpenseRepository } from '../database/repositories/expenseRepository';
import { EmployeeRepository } from '../database/repositories/employeeRepository';
import { AttendanceRepository } from '../database/repositories/attendanceRepository';
import { LeaveRequestRepository } from '../database/repositories/leaveRequestRepository';
import { SalaryRecordRepository } from '../database/repositories/salaryRecordRepository';

export async function testWatermelonDB() {
  console.log('Starting WatermelonDB tests...');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Test 1: Database is ready
    console.log('Test 1: Database initialization');
    if (database) {
      results.passed++;
      results.tests.push({ name: 'Database initialization', status: 'PASSED' });
      console.log('✓ Database initialized successfully');
    } else {
      results.failed++;
      results.tests.push({ name: 'Database initialization', status: 'FAILED', error: 'Database not initialized' });
      console.log('✗ Database initialization failed');
    }

    // Test 2: SyncQueue operations
    console.log('\nTest 2: SyncQueue operations');
    try {
      // Enqueue test
      const { clientId } = await SyncQueue.enqueue('TEST_MUTATION', { testData: 'test' });
      console.log('✓ Enqueue operation successful');
      
      // Get pending test
      const pending = await SyncQueue.getPending();
      if (pending.length > 0 && pending[0].clientId === clientId) {
        console.log('✓ Get pending operation successful');
      } else {
        throw new Error('Get pending returned incorrect data');
      }
      
      // Get count test
      const count = await SyncQueue.getCount();
      if (count > 0) {
        console.log('✓ Get count operation successful');
      } else {
        throw new Error('Get count returned 0');
      }
      
      // Cleanup
      await SyncQueue.clearQueue();
      console.log('✓ Clear queue operation successful');
      
      results.passed++;
      results.tests.push({ name: 'SyncQueue operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'SyncQueue operations', status: 'FAILED', error: error.message });
      console.log('✗ SyncQueue operations failed:', error.message);
    }

    // Test 3: ProductRepository operations
    console.log('\nTest 3: ProductRepository operations');
    try {
      // Create test
      const product = await ProductRepository.create({
        name: 'Test Product',
        category_id: 'test-category',
        unit: 'kg',
        current_stock: 100,
        auto_deduct_on_sale: true,
      });
      console.log('✓ Product creation successful');
      
      // Find test
      const found = await ProductRepository.findById(product.id);
      if (found && found.name === 'Test Product') {
        console.log('✓ Product find operation successful');
      } else {
        throw new Error('Product find returned incorrect data');
      }
      
      // Update test
      const updated = await ProductRepository.update(product.id, { name: 'Updated Product' });
      if (updated.name === 'Updated Product') {
        console.log('✓ Product update operation successful');
      } else {
        throw new Error('Product update failed');
      }
      
      // Update stock test
      await ProductRepository.updateStock(product.id, 50);
      const stockUpdated = await ProductRepository.findById(product.id);
      if (stockUpdated.currentStock === 150) {
        console.log('✓ Product stock update successful');
      } else {
        throw new Error('Stock update failed');
      }
      
      // Get all test
      const all = await ProductRepository.findAll();
      if (all.length > 0) {
        console.log('✓ Product get all operation successful');
      } else {
        throw new Error('Get all returned empty array');
      }
      
      // Cleanup
      await ProductRepository.delete(product.id);
      console.log('✓ Product delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'ProductRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'ProductRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ ProductRepository operations failed:', error.message);
    }

    // Test 4: ReceiptRepository operations
    console.log('\nTest 4: ReceiptRepository operations');
    try {
      // Create test
      const receipt = await ReceiptRepository.create({
        session_id: 'test-session',
        receipt_number: 'TEST-001',
        subtotal: 100,
        discount: 0,
        total: 100,
        balance: 100,
        status: 'OPEN',
        table_note: 'Test table',
      });
      console.log('✓ Receipt creation successful');
      
      // Find test
      const found = await ReceiptRepository.findById(receipt.id);
      if (found && found.receiptNumber === 'TEST-001') {
        console.log('✓ Receipt find operation successful');
      } else {
        throw new Error('Receipt find returned incorrect data');
      }
      
      // Update test
      const updated = await ReceiptRepository.update(receipt.id, { status: 'PAID' });
      if (updated.status === 'PAID') {
        console.log('✓ Receipt update operation successful');
      } else {
        throw new Error('Receipt update failed');
      }
      
      // Cleanup
      await ReceiptRepository.delete(receipt.id);
      console.log('✓ Receipt delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'ReceiptRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'ReceiptRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ ReceiptRepository operations failed:', error.message);
    }

    // Test 5: ExpenseRepository operations
    console.log('\nTest 5: ExpenseRepository operations');
    try {
      // Create test
      const expense = await ExpenseRepository.create({
        item_name: 'Test Expense',
        quantity: 5,
        unit_price: 10,
        total_price: 50,
        amount_paid: 50,
        balance: 0,
        is_fully_paid: true,
        supplier_name: 'Test Supplier',
      });
      console.log('✓ Expense creation successful');
      
      // Find test
      const found = await ExpenseRepository.findById(expense.id);
      if (found && found.itemName === 'Test Expense') {
        console.log('✓ Expense find operation successful');
      } else {
        throw new Error('Expense find returned incorrect data');
      }
      
      // Update payment test
      await ExpenseRepository.updatePayment(expense.id, 25);
      const paymentUpdated = await ExpenseRepository.findById(expense.id);
      if (paymentUpdated.amountPaid === 75) {
        console.log('✓ Expense payment update successful');
      } else {
        throw new Error('Payment update failed');
      }
      
      // Cleanup
      await ExpenseRepository.delete(expense.id);
      console.log('✓ Expense delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'ExpenseRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'ExpenseRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ ExpenseRepository operations failed:', error.message);
    }

    // Test 6: EmployeeRepository operations
    console.log('\nTest 6: EmployeeRepository operations');
    try {
      // Create test
      const employee = await EmployeeRepository.create({
        name: 'Test Employee',
        role: 'CASHIER',
        permissions: ['create_order', 'view_expense'],
      });
      console.log('✓ Employee creation successful');
      
      // Find test
      const found = await EmployeeRepository.findById(employee.id);
      if (found && found.name === 'Test Employee') {
        console.log('✓ Employee find operation successful');
      } else {
        throw new Error('Employee find returned incorrect data');
      }
      
      // Update test
      const updated = await EmployeeRepository.update(employee.id, { role: 'MANAGER' });
      if (updated.role === 'MANAGER') {
        console.log('✓ Employee update operation successful');
      } else {
        throw new Error('Employee update failed');
      }
      
      // Cleanup
      await EmployeeRepository.delete(employee.id);
      console.log('✓ Employee delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'EmployeeRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'EmployeeRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ EmployeeRepository operations failed:', error.message);
    }

    // Test 7: AttendanceRepository operations
    console.log('\nTest 7: AttendanceRepository operations');
    try {
      // Create test
      const attendance = await AttendanceRepository.create({
        employee_id: 'test-employee',
        employee_name: 'Test Employee',
        date: new Date().toISOString().split('T')[0],
        check_in_time: '09:00',
        status: 'PRESENT',
      });
      console.log('✓ Attendance creation successful');
      
      // Find test
      const found = await AttendanceRepository.findById(attendance.id);
      if (found && found.employeeName === 'Test Employee') {
        console.log('✓ Attendance find operation successful');
      } else {
        throw new Error('Attendance find returned incorrect data');
      }
      
      // Update test
      const updated = await AttendanceRepository.update(attendance.id, { check_out_time: '17:00' });
      if (updated.checkOutTime === '17:00') {
        console.log('✓ Attendance update operation successful');
      } else {
        throw new Error('Attendance update failed');
      }
      
      // Cleanup
      await AttendanceRepository.delete(attendance.id);
      console.log('✓ Attendance delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'AttendanceRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'AttendanceRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ AttendanceRepository operations failed:', error.message);
    }

    // Test 8: LeaveRequestRepository operations
    console.log('\nTest 8: LeaveRequestRepository operations');
    try {
      // Create test
      const leaveRequest = await LeaveRequestRepository.create({
        employee_id: 'test-employee',
        employee_name: 'Test Employee',
        leave_type: 'ANNUAL',
        start_date: '2024-01-01',
        end_date: '2024-01-05',
        reason: 'Test leave',
        status: 'PENDING',
      });
      console.log('✓ Leave request creation successful');
      
      // Find test
      const found = await LeaveRequestRepository.findById(leaveRequest.id);
      if (found && found.leaveType === 'ANNUAL') {
        console.log('✓ Leave request find operation successful');
      } else {
        throw new Error('Leave request find returned incorrect data');
      }
      
      // Approve test
      const approved = await LeaveRequestRepository.approve(leaveRequest.id);
      if (approved.status === 'APPROVED') {
        console.log('✓ Leave request approve operation successful');
      } else {
        throw new Error('Leave request approve failed');
      }
      
      // Cleanup
      await LeaveRequestRepository.delete(leaveRequest.id);
      console.log('✓ Leave request delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'LeaveRequestRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'LeaveRequestRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ LeaveRequestRepository operations failed:', error.message);
    }

    // Test 9: SalaryRecordRepository operations
    console.log('\nTest 9: SalaryRecordRepository operations');
    try {
      // Create test
      const salaryRecord = await SalaryRecordRepository.create({
        employee_id: 'test-employee',
        employee_name: 'Test Employee',
        month: 'January',
        year: 2024,
        basic_salary: 50000,
        allowances: 5000,
        deductions: 2000,
        net_salary: 53000,
        status: 'DRAFT',
      });
      console.log('✓ Salary record creation successful');
      
      // Find test
      const found = await SalaryRecordRepository.findById(salaryRecord.id);
      if (found && found.employeeName === 'Test Employee') {
        console.log('✓ Salary record find operation successful');
      } else {
        throw new Error('Salary record find returned incorrect data');
      }
      
      // Approve test
      const approved = await SalaryRecordRepository.approve(salaryRecord.id);
      if (approved.status === 'APPROVED') {
        console.log('✓ Salary record approve operation successful');
      } else {
        throw new Error('Salary record approve failed');
      }
      
      // Cleanup
      await SalaryRecordRepository.delete(salaryRecord.id);
      console.log('✓ Salary record delete operation successful');
      
      results.passed++;
      results.tests.push({ name: 'SalaryRecordRepository operations', status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'SalaryRecordRepository operations', status: 'FAILED', error: error.message });
      console.log('✗ SalaryRecordRepository operations failed:', error.message);
    }

  } catch (error) {
    console.error('Critical error during testing:', error);
    results.failed++;
    results.tests.push({ name: 'Critical error', status: 'FAILED', error: error.message });
  }

  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✓' : '✗'} ${test.name}${test.status === 'FAILED' ? `: ${test.error}` : ''}`);
  });

  return results;
}
