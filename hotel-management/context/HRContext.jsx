// context/HRContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "./AuthContext";

import {
  fetchEmployeesService,
  fetchAllContractsService,
  fetchMyContractService,
  createContractService,
  updateContractService,
  fetchTodayAttendanceService,
  fetchEmployeeAttendanceService,
  fetchMyAttendanceService,
  selfCheckInService,
  selfCheckOutService,
  recordAttendanceService,
  managerCheckOutService,
  fetchLeaveRequestsService,
  fetchMyLeaveRequestsService,
  requestLeaveService,
  reviewLeaveService,
  fetchSalaryRecordsService,
  fetchMyPayslipsService,
  fetchSalaryPaymentsService,
  generatePayslipService,
  approvePayslipService,
  addSalaryPaymentService,
} from "../services/hrService";

import {
  fetchGroupedPermissionsService,
  createEmployeeWithPermissionsService,
} from "../services/employeeService";

const HRContext = createContext();
export const useHR = () => useContext(HRContext);

export const HRProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // ── State ──────────────────────────────────────────
  const [employees,           setEmployees]           = useState([]);
  const [myContract,          setMyContract]          = useState(null);
  const [todayAttendance,     setTodayAttendance]     = useState([]);
  const [employeeAttendance,  setEmployeeAttendance]  = useState([]);
  const [myAttendance,        setMyAttendance]        = useState([]);
  const [leaveRequests,       setLeaveRequests]       = useState([]);
  const [myLeaveRequests,     setMyLeaveRequests]     = useState([]);
  const [salaryRecords,       setSalaryRecords]       = useState([]);
  const [myPayslips,          setMyPayslips]          = useState([]);
  const [salaryPayments,      setSalaryPayments]      = useState([]);
  const [groupedPermissions,  setGroupedPermissions]  = useState([]);

  // ── Loading flags ──────────────────────────────────
  const [loading,           setLoading]           = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [payrollLoading,    setPayrollLoading]    = useState(false);


  // ======================================================
  // EMPLOYEES
  // Fetches employees and contracts in parallel then merges.
  // ======================================================

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [emps, contracts] = await Promise.all([
        fetchEmployeesService(),
        fetchAllContractsService(),
      ]);
      const contractMap = {};
      contracts.forEach((c) => {
        if (c.employee?.id) contractMap[c.employee.id] = c;
      });
      setEmployees(
        emps.map((e) => ({ ...e, contract: contractMap[e.id] ?? null }))
      );
    } catch (err) {
      console.log("Load Employees Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (input) => {
    try {
      const result = await createEmployeeWithPermissionsService(input);
      await loadEmployees();
      return result;
    } catch (err) {
      console.log("Create Employee Error:", err);
      throw err;
    }
  };


  // ======================================================
  // GROUPED PERMISSIONS
  // Loaded once on demand — cached in state.
  // ======================================================

  const loadGroupedPermissions = async () => {
    try {
      const data = await fetchGroupedPermissionsService();
      setGroupedPermissions(data);
    } catch (err) {
      console.log("Load Grouped Permissions Error:", err);
      throw err;
    }
  };


  // ======================================================
  // CONTRACTS
  // ======================================================

  const loadMyContract = async () => {
    try {
      const data = await fetchMyContractService();
      setMyContract(data);
    } catch (err) {
      console.log("Load My Contract Error:", err);
    }
  };

  const createContract = async (input) => {
    try {
      const result = await createContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
      console.log("Create Contract Error:", err);
      throw err;
    }
  };

  const updateContract = async (input) => {
    try {
      const result = await updateContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
      console.log("Update Contract Error:", err);
      throw err;
    }
  };


  // ======================================================
  // ATTENDANCE
  // ======================================================

  const loadTodayAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const data = await fetchTodayAttendanceService();
      setTodayAttendance(data);
    } catch (err) {
      console.log("Load Today Attendance Error:", err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadEmployeeAttendance = async (employeeId, year, month) => {
    try {
      setAttendanceLoading(true);
      const data = await fetchEmployeeAttendanceService(employeeId, year, month);
      setEmployeeAttendance(data);
    } catch (err) {
      console.log("Load Employee Attendance Error:", err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadMyAttendance = async (year, month) => {
    try {
      const data = await fetchMyAttendanceService(year, month);
      setMyAttendance(data);
    } catch (err) {
      console.log("Load My Attendance Error:", err);
    }
  };

  const selfCheckIn = async () => {
    try {
      const result = await selfCheckInService();
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.log("Self Check-in Error:", err);
      throw err;
    }
  };

  const selfCheckOut = async () => {
    try {
      const result = await selfCheckOutService();
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.log("Self Check-out Error:", err);
      throw err;
    }
  };

  const recordAttendance = async (input) => {
    try {
      const result = await recordAttendanceService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.log("Record Attendance Error:", err);
      throw err;
    }
  };

  const managerCheckOut = async (input) => {
    try {
      const result = await managerCheckOutService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.log("Manager Check-out Error:", err);
      throw err;
    }
  };


  // ======================================================
  // LEAVE REQUESTS
  // ======================================================

  const loadLeaveRequests = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await fetchLeaveRequestsService(filters);
      setLeaveRequests(data);
    } catch (err) {
      console.log("Load Leave Requests Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyLeaveRequests = async () => {
    try {
      const data = await fetchMyLeaveRequestsService();
      setMyLeaveRequests(data);
    } catch (err) {
      console.log("Load My Leave Requests Error:", err);
    }
  };

  const requestLeave = async (input) => {
    try {
      const result = await requestLeaveService(input);
      await loadMyLeaveRequests();
      return result;
    } catch (err) {
      console.log("Request Leave Error:", err);
      throw err;
    }
  };

  const reviewLeave = async (input) => {
    try {
      const result = await reviewLeaveService(input);
      await loadLeaveRequests();
      return result;
    } catch (err) {
      console.log("Review Leave Error:", err);
      throw err;
    }
  };


  // ======================================================
  // SALARY RECORDS
  // ======================================================

  const loadSalaryRecords = async (filters = {}) => {
    try {
      setPayrollLoading(true);
      const data = await fetchSalaryRecordsService(filters);
      setSalaryRecords(data);
    } catch (err) {
      console.log("Load Salary Records Error:", err);
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadMyPayslips = async (year = null) => {
    try {
      const data = await fetchMyPayslipsService(year);
      setMyPayslips(data);
    } catch (err) {
      console.log("Load My Payslips Error:", err);
    }
  };

  const loadSalaryPayments = async (salaryRecordId) => {
    try {
      const data = await fetchSalaryPaymentsService(salaryRecordId);
      setSalaryPayments(data);
    } catch (err) {
      console.log("Load Salary Payments Error:", err);
    }
  };

  const generatePayslip = async (input) => {
    try {
      const result = await generatePayslipService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.log("Generate Payslip Error:", err);
      throw err;
    }
  };

  const approvePayslip = async (salaryRecordId) => {
    try {
      const result = await approvePayslipService(salaryRecordId);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.log("Approve Payslip Error:", err);
      throw err;
    }
  };

  const addSalaryPayment = async (input) => {
    try {
      const result = await addSalaryPaymentService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.log("Add Salary Payment Error:", err);
      throw err;
    }
  };


  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadEmployees();
      loadMyContract();
      loadTodayAttendance();
      loadMyLeaveRequests();
    }
  }, [isAuthenticated]);


  // ======================================================
  // CONTEXT VALUE
  // ======================================================

  const value = useMemo(
    () => ({
      // State
      employees,
      myContract,
      todayAttendance,
      employeeAttendance,
      myAttendance,
      leaveRequests,
      myLeaveRequests,
      salaryRecords,
      myPayslips,
      salaryPayments,
      groupedPermissions,

      // Loading
      loading,
      attendanceLoading,
      payrollLoading,

      // Employees
      loadEmployees,
      createEmployee,

      // Grouped permissions
      loadGroupedPermissions,

      // Contracts
      loadMyContract,
      createContract,
      updateContract,

      // Attendance
      loadTodayAttendance,
      loadEmployeeAttendance,
      loadMyAttendance,
      selfCheckIn,
      selfCheckOut,
      recordAttendance,
      managerCheckOut,

      // Leave
      loadLeaveRequests,
      loadMyLeaveRequests,
      requestLeave,
      reviewLeave,

      // Salary
      loadSalaryRecords,
      loadMyPayslips,
      loadSalaryPayments,
      generatePayslip,
      approvePayslip,
      addSalaryPayment,
    }),
    [
      employees,
      myContract,
      todayAttendance,
      employeeAttendance,
      myAttendance,
      leaveRequests,
      myLeaveRequests,
      salaryRecords,
      myPayslips,
      salaryPayments,
      groupedPermissions,
      loading,
      attendanceLoading,
      payrollLoading,
    ]
  );

  return (
    <HRContext.Provider value={value}>
      {children}
    </HRContext.Provider>
  );
};