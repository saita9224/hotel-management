// context/ReportsContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
} from "react";

import {
  fetchSalesReportService,
  fetchProductPerformanceService,
  fetchExpenseReportService,
  fetchStockHealthService,
  fetchPayrollReportService,
  fetchAttendanceReportService,
  fetchCreditExposureService,
} from "../services/reportsService";

const ReportsContext = createContext();
export const useReports = () => useContext(ReportsContext);

export const ReportsProvider = ({ children }) => {

  // ── Data state ─────────────────────────────────────
  const [salesReport,       setSalesReport]       = useState(null);
  const [productReport,     setProductReport]     = useState([]);
  const [expenseReport,     setExpenseReport]     = useState(null);
  const [stockReport,       setStockReport]       = useState([]);
  const [payrollReport,     setPayrollReport]     = useState(null);
  const [attendanceReport,  setAttendanceReport]  = useState(null);
  const [creditReport,      setCreditReport]      = useState(null);

  // ── Loading state per report ────────────────────────
  const [salesLoading,      setSalesLoading]      = useState(false);
  const [productLoading,    setProductLoading]    = useState(false);
  const [expenseLoading,    setExpenseLoading]    = useState(false);
  const [stockLoading,      setStockLoading]      = useState(false);
  const [payrollLoading,    setPayrollLoading]    = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [creditLoading,     setCreditLoading]     = useState(false);


  // ======================================================
  // LOADERS
  // ======================================================

  const loadSalesReport = async (startDate, endDate) => {
    try {
      setSalesLoading(true);
      const data = await fetchSalesReportService(startDate, endDate);
      setSalesReport(data);
    } catch (err) {
      console.log("Sales Report Error:", err);
      throw err;
    } finally {
      setSalesLoading(false);
    }
  };

  const loadProductReport = async (startDate, endDate, limit = 20) => {
    try {
      setProductLoading(true);
      const data = await fetchProductPerformanceService(startDate, endDate, limit);
      setProductReport(data);
    } catch (err) {
      console.log("Product Report Error:", err);
      throw err;
    } finally {
      setProductLoading(false);
    }
  };

  const loadExpenseReport = async (startDate, endDate) => {
    try {
      setExpenseLoading(true);
      const data = await fetchExpenseReportService(startDate, endDate);
      setExpenseReport(data);
    } catch (err) {
      console.log("Expense Report Error:", err);
      throw err;
    } finally {
      setExpenseLoading(false);
    }
  };

  const loadStockReport = async (startDate, endDate) => {
    try {
      setStockLoading(true);
      const data = await fetchStockHealthService(startDate, endDate);
      setStockReport(data);
    } catch (err) {
      console.log("Stock Report Error:", err);
      throw err;
    } finally {
      setStockLoading(false);
    }
  };

  const loadPayrollReport = async (year, month) => {
    try {
      setPayrollLoading(true);
      const data = await fetchPayrollReportService(year, month);
      setPayrollReport(data);
    } catch (err) {
      console.log("Payroll Report Error:", err);
      throw err;
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadAttendanceReport = async (year, month) => {
    try {
      setAttendanceLoading(true);
      const data = await fetchAttendanceReportService(year, month);
      setAttendanceReport(data);
    } catch (err) {
      console.log("Attendance Report Error:", err);
      throw err;
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadCreditReport = async () => {
    try {
      setCreditLoading(true);
      const data = await fetchCreditExposureService();
      setCreditReport(data);
    } catch (err) {
      console.log("Credit Report Error:", err);
      throw err;
    } finally {
      setCreditLoading(false);
    }
  };


  // ======================================================
  // CONTEXT VALUE
  // ======================================================

  const value = useMemo(() => ({
    // Data
    salesReport,
    productReport,
    expenseReport,
    stockReport,
    payrollReport,
    attendanceReport,
    creditReport,

    // Loading
    salesLoading,
    productLoading,
    expenseLoading,
    stockLoading,
    payrollLoading,
    attendanceLoading,
    creditLoading,

    // Loaders
    loadSalesReport,
    loadProductReport,
    loadExpenseReport,
    loadStockReport,
    loadPayrollReport,
    loadAttendanceReport,
    loadCreditReport,
  }), [
    salesReport,
    productReport,
    expenseReport,
    stockReport,
    payrollReport,
    attendanceReport,
    creditReport,
    salesLoading,
    productLoading,
    expenseLoading,
    stockLoading,
    payrollLoading,
    attendanceLoading,
    creditLoading,
  ]);

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
};