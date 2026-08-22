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
import { SalaryRecordRepository } from "../database/repositories/salaryRecordRepository";

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


  // ======================================================
  // EMPLOYEES
  // Fetches employees and contracts in parallel then merges.
  // ======================================================

  const loadEmployees = async () => {
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
        console.error("Failed to load employees from local database:", localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (input) => {
    if (!isOnline) {
      const { clientId } = await enqueueMutation("CREATE_EMPLOYEE", input);
      await refreshQueueCount();
      
      const mockEmployee = {
        id: clientId,
        name: input.name,
        role: input.role || 'EMPLOYEE',
        permissions: input.permissions || [],
        created_at: new Date().toISOString(),
      };
      
      // Store in local database
      await EmployeeRepository.create({
        id: clientId,
        name: input.name,
        role: input.role || 'EMPLOYEE',
        permissions: input.permissions || [],
        synced: false,
      });
      
      setEmployees((prev) => [mockEmployee, ...prev]);
      return { createEmployee: mockEmployee };
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
      const { clientId } = await enqueueMutation("CREATE_EMPLOYEE", input);
      await refreshQueueCount();
      
      const mockEmployee = {
        id: clientId,
        name: input.name,
        role: input.role || 'EMPLOYEE',
        permissions: input.permissions || [],
        created_at: new Date().toISOString(),
      };
      
      await EmployeeRepository.create({
        id: clientId,
        name: input.name,
        role: input.role || 'EMPLOYEE',
        permissions: input.permissions || [],
        synced: false,
      });
      
      setEmployees((prev) => [mockEmployee, ...prev]);
      return { createEmployee: mockEmployee };
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
("Load Grouped Permissions Error:", err);
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
("Load My Contract Error:", err);
    }
  };

  const createContract = async (input) => {
    try {
      const result = await createContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
("Create Contract Error:", err);
      throw err;
    }
  };

  const updateContract = async (input) => {
    try {
      const result = await updateContractService(input);
      await loadEmployees();
      return result;
    } catch (err) {
("Update Contract Error:", err);
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
        const data = await fetchTodayAttendanceService();
        
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
      } else {
        // Load from local database
        const localData = await AttendanceRepository.findByDate(today);
        setTodayAttendance(localData);
      }
    } catch (err) {
      // Fallback to local data if server fails
      try {
        const today = new Date().toISOString().split('T')[0];
        const localData = await AttendanceRepository.findByDate(today);
        setTodayAttendance(localData);
      } catch (localError) {
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
("Load Employee Attendance Error:", err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadMyAttendance = async (year, month) => {
    try {
      const data = await fetchMyAttendanceService(year, month);
      setMyAttendance(data);
    } catch (err) {
("Load My Attendance Error:", err);
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
    
    try {
      const result = await selfCheckInService();
      await loadTodayAttendance();
      return result;
    } catch (err) {
      // Fallback to offline if network fails
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
  };

  const selfCheckOut = async () => {
    try {
      const result = await selfCheckOutService();
      await loadTodayAttendance();
      return result;
    } catch (err) {
("Self Check-out Error:", err);
      throw err;
    }
  };

  const recordAttendance = async (input) => {
    try {
      const result = await recordAttendanceService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
("Record Attendance Error:", err);
      throw err;
    }
  };

  const managerCheckOut = async (input) => {
    try {
      const result = await managerCheckOutService(input);
      await loadTodayAttendance();
      return result;
    } catch (err) {
("Manager Check-out Error:", err);
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
("Load Leave Requests Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyLeaveRequests = async () => {
    try {
      const data = await fetchMyLeaveRequestsService();
      setMyLeaveRequests(data);
    } catch (err) {
("Load My Leave Requests Error:", err);
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
    
    try {
      const result = await requestLeaveService(input);
      
      // Store in local database
      await LeaveRequestRepository.create({
        ...result,
        synced: true,
      });
      
      await loadMyLeaveRequests();
      return result;
    } catch (err) {
      // Fallback to offline if network fails
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
  };

  const reviewLeave = async (input) => {
    try {
      const result = await reviewLeaveService(input);
      await loadLeaveRequests();
      return result;
    } catch (err) {
("Review Leave Error:", err);
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
("Load Salary Records Error:", err);
    } finally {
      setPayrollLoading(false);
    }
  };

  const loadMyPayslips = async (year = null) => {
    try {
      const data = await fetchMyPayslipsService(year);
      setMyPayslips(data);
    } catch (err) {
("Load My Payslips Error:", err);
    }
  };

  const loadSalaryPayments = async (salaryRecordId) => {
    try {
      const data = await fetchSalaryPaymentsService(salaryRecordId);
      setSalaryPayments(data);
    } catch (err) {
("Load Salary Payments Error:", err);
    }
  };

  const generatePayslip = async (input) => {
    try {
      const result = await generatePayslipService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
("Generate Payslip Error:", err);
      throw err;
    }
  };

  const approvePayslip = async (salaryRecordId) => {
    try {
      const result = await approvePayslipService(salaryRecordId);
      await loadSalaryRecords();
      return result;
    } catch (err) {
("Approve Payslip Error:", err);
      throw err;
    }
  };

  const addSalaryPayment = async (input) => {
    try {
      const result = await addSalaryPaymentService(input);
      await loadSalaryRecords();
      return result;
    } catch (err) {
("Add Salary Payment Error:", err);
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