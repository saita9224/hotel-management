// context/HRContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";
import { enqueueMutation } from "../database/syncQueue";
import { EmployeeRepository } from "../database/repositories/employeeRepository";
import { AttendanceRepository } from "../database/repositories/attendanceRepository";
import { LeaveRequestRepository } from "../database/repositories/leaveRequestRepository";

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

const fromLocalAttendance = (row) => ({
  id: row.id,
  employee_id: row.employeeId,
  employee_name: row.employeeName,
  date: row.date,
  time_in: row.checkInTime,
  time_out: row.checkOutTime,
  status: row.status,
});

const fromLocalLeaveRequest = (row) => ({
  id: row.id,
  employee_id: row.employeeId,
  employee_name: row.employeeName,
  leave_type: row.leaveType,
  start_date: row.startDate,
  end_date: row.endDate,
  total_days: Math.max(1, Math.floor((new Date(row.endDate) - new Date(row.startDate)) / 86400000) + 1),
  reason: row.reason,
  status: row.status,
  created_at: row.createdAt,
});

const HRContext = createContext();
export const useHR = () => useContext(HRContext);

export const HRProvider = ({ children }) => {
  const { isAuthenticated, permissions = [] } = useAuth();
  const { isOnline, refreshQueueCount } = useOffline();

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
  const [loadErrors, setLoadErrors] = useState({});
  const setLoadError = (key, error) => setLoadErrors((current) => ({
    ...current,
    [key]: error?.message || String(error || "Could not load data."),
  }));
  const clearLoadError = (key) => setLoadErrors((current) => {
    const next = { ...current };
    delete next[key];
    return next;
  });


  // ======================================================
  // EMPLOYEES
  // Fetches employees and contracts in parallel then merges.
  // ======================================================

  const loadEmployees = async () => {
    if (!permissions.includes("employee.view") || !permissions.includes("hr.view_contracts")) {
      setEmployees([]);
      return;
    }
    try {
      setLoading(true);
      // Try to load from server first if online
      if (isOnline) {
        const [emps, contracts] = await Promise.all([
          fetchEmployeesService(),
          fetchAllContractsService(),
        ]);
        const contractMap = {};
        contracts.forEach((c) => {
          if (c.employee?.id) contractMap[c.employee.id] = c;
        });
        
        // Sync server data to local database
        for (const emp of emps) {
          const existing = await EmployeeRepository.findById(emp.id);
          if (existing) {
            await EmployeeRepository.update(emp.id, emp);
          } else {
            await EmployeeRepository.create({ ...emp, synced: true });
          }
        }
        
        setEmployees(
          emps.map((e) => ({ ...e, contract: contractMap[e.id] ?? null }))
        );
        clearLoadError("employees");
      } else {
        // Load from local database
        const localData = await EmployeeRepository.findAll();
        setEmployees(localData);
      }
    } catch (err) {
      // Fallback to local data if server fails
      try {
        const localData = await EmployeeRepository.findAll();
        setEmployees(localData);
      } catch (localError) {
        setLoadError("employees", err);
        console.error("Failed to load employees from local database:", localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (input) => {
    if (!isOnline) {
      throw new Error("Employee accounts can only be created while online.");
    }
    
    try {
      const result = await createEmployeeWithPermissionsService(input);
      
      // Store in local database
      await EmployeeRepository.create({
        ...result.createEmployee,
        synced: true,
      });
      
      await loadEmployees();
      return result;
    } catch (err) {
      // Fallback to offline if network fails
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
      console.error("Load Grouped Permissions Error:", err);
      throw err;
    }
  };


  // ======================================================
  // CONTRACTS
  // ======================================================

  const loadMyContract = async () => {
    if (!permissions.includes("hr.view_contracts")) {
      setMyContract(null);
      return;
    }
    try {
      const data = await fetchMyContractService();
      setMyContract(data);
    } catch (err) {
      console.error("Load My Contract Error:", err);
    }
  };

  const createContract = async (input) => {
    try {
      const result = await createContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
      console.error("Create Contract Error:", err);
      throw err;
    }
  };

  const updateContract = async (input) => {
    try {
      const result = await updateContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
      console.error("Update Contract Error:", err);
      throw err;
    }
  };


  // ======================================================
  // ATTENDANCE
  // ======================================================

  const loadTodayAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      if (isOnline) {
        const data = permissions.includes("hr.view_attendance")
          ? await fetchTodayAttendanceService()
          : permissions.includes("hr.self_checkin")
            ? (await fetchMyAttendanceService(new Date().getFullYear(), new Date().getMonth() + 1))
                .filter((record) => record.date === today)
            : [];
        
        // Sync server data to local database
        for (const attendance of data) {
          const existing = await AttendanceRepository.findById(attendance.id);
          if (existing) {
            await AttendanceRepository.update(attendance.id, attendance);
          } else {
            await AttendanceRepository.create({ ...attendance, synced: true });
          }
        }
        
        setTodayAttendance(data);
        clearLoadError("attendance");
      } else {
        // Load from local database
        const localData = await AttendanceRepository.findByDate(today);
        setTodayAttendance(localData.map(fromLocalAttendance));
        clearLoadError("attendance");
      }
    } catch (err) {
      // Fallback to local data if server fails
      try {
        const today = new Date().toISOString().split('T')[0];
        const localData = await AttendanceRepository.findByDate(today);
        setTodayAttendance(localData.map(fromLocalAttendance));
      } catch (localError) {
        setLoadError("attendance", err);
        console.error("Failed to load attendance from local database:", localError);
      }
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
      console.error("Load Employee Attendance Error:", err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadMyAttendance = async (year, month) => {
    try {
      const data = await fetchMyAttendanceService(year, month);
      setMyAttendance(data);
    } catch (err) {
      console.error("Load My Attendance Error:", err);
    }
  };

  const selfCheckIn = async () => {
    if (!isOnline) {
      const { clientId } = await enqueueMutation("SELF_CHECK_IN", {});
      await refreshQueueCount();
      
      const currentTime = new Date().toLocaleTimeString();
      const mockAttendance = {
        id: clientId,
        employee_id: 'current-user',
        employee_name: 'Current User',
        date: new Date().toISOString().split('T')[0],
        check_in_time: currentTime,
        status: 'PRESENT',
        created_at: new Date().toISOString(),
      };
      
      // Store in local database
      await AttendanceRepository.create({
        id: clientId,
        employee_id: 'current-user',
        employee_name: 'Current User',
        date: new Date().toISOString().split('T')[0],
        check_in_time: currentTime,
        status: 'PRESENT',
        synced: false,
      });
      
      await loadTodayAttendance();
      return mockAttendance;
    }
    
    const result = await selfCheckInService();
    await loadTodayAttendance();
    return result;
  };

  const selfCheckOut = async () => {
    if (!isOnline) {
      const { clientId } = await enqueueMutation("SELF_CHECK_OUT", {});
      await refreshQueueCount();
      const today = new Date().toISOString().split('T')[0];
      await AttendanceRepository.updateByEmployeeAndDate('current-user', today, {
        check_out_time: new Date().toLocaleTimeString(),
      });
      await loadTodayAttendance();
      return { id: clientId, date: today };
    }
    try {
      const result = await selfCheckOutService();
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.error("Self Check-out Error:", err);
      throw err;
    }
  };

  const recordAttendance = async (input) => {
    try {
      const result = await recordAttendanceService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.error("Record Attendance Error:", err);
      throw err;
    }
  };

  const managerCheckOut = async (input) => {
    try {
      const result = await managerCheckOutService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
      console.error("Manager Check-out Error:", err);
      throw err;
    }
  };


  // ======================================================
  // LEAVE REQUESTS
  // ======================================================

  const loadLeaveRequests = async (filters = {}) => {
    if (!permissions.includes("hr.view_leave")) {
      setLeaveRequests([]);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchLeaveRequestsService(filters);
      setLeaveRequests(data);
      clearLoadError("leave");
    } catch (err) {
      setLoadError("leave", err);
      console.error("Load Leave Requests Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyLeaveRequests = async () => {
    if (!permissions.includes("hr.request_leave")) {
      setMyLeaveRequests([]);
      return;
    }
    try {
      if (!isOnline) {
        const localData = await LeaveRequestRepository.findByEmployee('current-user');
        setMyLeaveRequests(localData.map(fromLocalLeaveRequest));
        return;
      }
      const data = await fetchMyLeaveRequestsService();
      setMyLeaveRequests(data);
      clearLoadError("leave");
    } catch (err) {
      try {
        const localData = await LeaveRequestRepository.findByEmployee('current-user');
        setMyLeaveRequests(localData.map(fromLocalLeaveRequest));
      } catch (localError) {
        setLoadError("leave", err);
        console.error("Load My Leave Requests Error:", err, localError);
      }
    }
  };

  const requestLeave = async (input) => {
    if (!isOnline) {
      const { clientId } = await enqueueMutation("REQUEST_LEAVE", input);
      await refreshQueueCount();
      
      const mockLeaveRequest = {
        id: clientId,
        employee_id: 'current-user',
        employee_name: 'Current User',
        leave_type: input.leave_type,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };
      
      // Store in local database
      await LeaveRequestRepository.create({
        id: clientId,
        employee_id: 'current-user',
        employee_name: 'Current User',
        leave_type: input.leave_type,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason,
        status: 'PENDING',
        synced: false,
      });
      
      await loadMyLeaveRequests();
      return mockLeaveRequest;
    }
    
    const result = await requestLeaveService(input);
    await loadMyLeaveRequests();
    return result;
  };

  const reviewLeave = async (input) => {
    try {
      const result = await reviewLeaveService(input);
      await loadLeaveRequests();
      return result;
    } catch (err) {
      console.error("Review Leave Error:", err);
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
      clearLoadError("payroll");
    } catch (err) {
      setLoadError("payroll", err);
      console.error("Load Salary Records Error:", err);
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadMyPayslips = async (year = null) => {
    try {
      const data = await fetchMyPayslipsService(year);
      setMyPayslips(data);
    } catch (err) {
      setLoadError("payroll", err);
      console.error("Load My Payslips Error:", err);
    }
  };

  const loadSalaryPayments = async (salaryRecordId) => {
    try {
      const data = await fetchSalaryPaymentsService(salaryRecordId);
      setSalaryPayments(data);
    } catch (err) {
      console.error("Load Salary Payments Error:", err);
    }
  };

  const generatePayslip = async (input) => {
    try {
      const result = await generatePayslipService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.error("Generate Payslip Error:", err);
      throw err;
    }
  };

  const approvePayslip = async (salaryRecordId) => {
    try {
      const result = await approvePayslipService(salaryRecordId);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.error("Approve Payslip Error:", err);
      throw err;
    }
  };

  const addSalaryPayment = async (input) => {
    try {
      const result = await addSalaryPaymentService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
      console.error("Add Salary Payment Error:", err);
      throw err;
    }
  };


  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    if (isAuthenticated) {
      if (permissions.includes("employee.view") && permissions.includes("hr.view_contracts")) loadEmployees();
      if (permissions.includes("hr.view_contracts")) loadMyContract();
      loadTodayAttendance();
      loadMyLeaveRequests();
    }
  }, [isAuthenticated, isOnline, permissions]);


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
      loadErrors,

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
      loadErrors,
    ]
  );

  return (
    <HRContext.Provider value={value}>
      {children}
    </HRContext.Provider>
  );
};
