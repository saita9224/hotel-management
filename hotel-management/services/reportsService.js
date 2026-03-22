// services/reportsService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeSalesSummary = (d) => ({
  total_revenue:   Number(d.totalRevenue ?? 0),
  order_count:     d.orderCount ?? 0,
  avg_order_value: Number(d.avgOrderValue ?? 0),
  refund_total:    Number(d.refundTotal ?? 0),
  credit_total:    Number(d.creditTotal ?? 0),
  net_revenue:     Number(d.netRevenue ?? 0),
  payment_breakdown: (d.paymentBreakdown ?? []).map((p) => ({
    method: p.method,
    total:  Number(p.total ?? 0),
    count:  p.count ?? 0,
  })),
  daily_breakdown: (d.dailyBreakdown ?? []).map((day) => ({
    date:            day.date,
    revenue:         Number(day.revenue ?? 0),
    order_count:     day.orderCount ?? 0,
    avg_order_value: Number(day.avgOrderValue ?? 0),
  })),
});

const normalizeProductPerformance = (p) => ({
  product_id:   p.productId,
  product_name: p.productName,
  units_sold:   Number(p.unitsSold ?? 0),
  revenue:      Number(p.revenue ?? 0),
  order_count:  p.orderCount ?? 0,
});

const normalizeExpenseSummary = (d) => ({
  total_expenses:    Number(d.totalExpenses ?? 0),
  total_paid:        Number(d.totalPaid ?? 0),
  total_outstanding: Number(d.totalOutstanding ?? 0),
  daily_breakdown: (d.dailyBreakdown ?? []).map((day) => ({
    date:        day.date,
    total_spent: Number(day.totalSpent ?? 0),
    item_count:  day.itemCount ?? 0,
  })),
  supplier_breakdown: (d.supplierBreakdown ?? []).map((s) => ({
    supplier_name: s.supplierName,
    total_spent:   Number(s.totalSpent ?? 0),
    item_count:    s.itemCount ?? 0,
  })),
});

const normalizeStockHealth = (p) => ({
  product_id:        p.productId,
  product_name:      p.productName,
  unit:              p.unit,
  current_stock:     Number(p.currentStock ?? 0),
  status:            p.status,
  total_in:          Number(p.totalIn ?? 0),
  total_out:         Number(p.totalOut ?? 0),
  total_adjustments: Number(p.totalAdjustments ?? 0),
});

const normalizePayrollSummary = (d) => ({
  total_gross:       Number(d.totalGross ?? 0),
  total_net:         Number(d.totalNet ?? 0),
  total_paid:        Number(d.totalPaid ?? 0),
  total_outstanding: Number(d.totalOutstanding ?? 0),
  per_employee: (d.perEmployee ?? []).map((e) => ({
    employee_id:   e.employeeId,
    employee_name: e.employeeName,
    gross_amount:  Number(e.grossAmount ?? 0),
    net_amount:    Number(e.netAmount ?? 0),
    total_paid:    Number(e.totalPaid ?? 0),
    balance:       Number(e.balance ?? 0),
    status:        e.status,
  })),
});

const normalizeAttendanceReport = (d) => ({
  year:  d.year,
  month: d.month,
  per_employee: (d.perEmployee ?? []).map((e) => ({
    employee_id:        e.employeeId,
    employee_name:      e.employeeName,
    present:            e.present ?? 0,
    absent:             e.absent ?? 0,
    late:               e.late ?? 0,
    half_day:           e.halfDay ?? 0,
    on_leave:           e.onLeave ?? 0,
    total_working_days: e.totalWorkingDays ?? 0,
  })),
});

const normalizeCreditExposure = (d) => ({
  total_credit:   Number(d.totalCredit ?? 0),
  overdue_count:  d.overdueCount ?? 0,
  overdue_amount: Number(d.overdueAmount ?? 0),
  accounts: (d.accounts ?? []).map((a) => ({
    receipt_number: a.receiptNumber,
    customer_name:  a.customerName,
    customer_phone: a.customerPhone ?? null,
    credit_amount:  Number(a.creditAmount ?? 0),
    due_date:       a.dueDate,
    is_overdue:     a.isOverdue,
  })),
});


// ======================================================
// SALES REPORT
// ======================================================

export const fetchSalesReportService = async (startDate, endDate) => {
  const data = await graphqlRequest(
    `
    query($startDate: Date!, $endDate: Date!) {
      salesReport(startDate: $startDate, endDate: $endDate) {
        totalRevenue
        orderCount
        avgOrderValue
        refundTotal
        creditTotal
        netRevenue
        paymentBreakdown { method total count }
        dailyBreakdown   { date revenue orderCount avgOrderValue }
      }
    }
  `,
    { startDate, endDate }
  );
  return normalizeSalesSummary(data.salesReport);
};


// ======================================================
// PRODUCT PERFORMANCE REPORT
// ======================================================

export const fetchProductPerformanceService = async (
  startDate,
  endDate,
  limit = 20,
) => {
  const data = await graphqlRequest(
    `
    query($startDate: Date!, $endDate: Date!, $limit: Int!) {
      productPerformanceReport(
        startDate: $startDate
        endDate: $endDate
        limit: $limit
      ) {
        productId
        productName
        unitsSold
        revenue
        orderCount
      }
    }
  `,
    { startDate, endDate, limit }
  );
  return (data?.productPerformanceReport ?? []).map(normalizeProductPerformance);
};


// ======================================================
// EXPENSE REPORT
// ======================================================

export const fetchExpenseReportService = async (startDate, endDate) => {
  const data = await graphqlRequest(
    `
    query($startDate: Date!, $endDate: Date!) {
      expenseReport(startDate: $startDate, endDate: $endDate) {
        totalExpenses
        totalPaid
        totalOutstanding
        dailyBreakdown    { date totalSpent itemCount }
        supplierBreakdown { supplierName totalSpent itemCount }
      }
    }
  `,
    { startDate, endDate }
  );
  return normalizeExpenseSummary(data.expenseReport);
};


// ======================================================
// STOCK HEALTH REPORT
// ======================================================

export const fetchStockHealthService = async (startDate, endDate) => {
  const data = await graphqlRequest(
    `
    query($startDate: Date!, $endDate: Date!) {
      stockHealthReport(startDate: $startDate, endDate: $endDate) {
        productId
        productName
        unit
        currentStock
        status
        totalIn
        totalOut
        totalAdjustments
      }
    }
  `,
    { startDate, endDate }
  );
  return (data?.stockHealthReport ?? []).map(normalizeStockHealth);
};


// ======================================================
// PAYROLL REPORT
// ======================================================

export const fetchPayrollReportService = async (year, month) => {
  const data = await graphqlRequest(
    `
    query($year: Int!, $month: Int!) {
      payrollReport(year: $year, month: $month) {
        totalGross
        totalNet
        totalPaid
        totalOutstanding
        perEmployee {
          employeeId
          employeeName
          grossAmount
          netAmount
          totalPaid
          balance
          status
        }
      }
    }
  `,
    { year, month }
  );
  return normalizePayrollSummary(data.payrollReport);
};


// ======================================================
// ATTENDANCE REPORT
// ======================================================

export const fetchAttendanceReportService = async (year, month) => {
  const data = await graphqlRequest(
    `
    query($year: Int!, $month: Int!) {
      attendanceReport(year: $year, month: $month) {
        year
        month
        perEmployee {
          employeeId
          employeeName
          present
          absent
          late
          halfDay
          onLeave
          totalWorkingDays
        }
      }
    }
  `,
    { year, month }
  );
  return normalizeAttendanceReport(data.attendanceReport);
};


// ======================================================
// CREDIT EXPOSURE REPORT
// ======================================================

export const fetchCreditExposureService = async () => {
  const data = await graphqlRequest(`
    query {
      creditExposureReport {
        totalCredit
        overdueCount
        overdueAmount
        accounts {
          receiptNumber
          customerName
          customerPhone
          creditAmount
          dueDate
          isOverdue
        }
      }
    }
  `);
  return normalizeCreditExposure(data.creditExposureReport);
};