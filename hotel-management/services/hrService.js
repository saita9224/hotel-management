// services/hrService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeContract = (c) => ({
  id:                    c.id,
  department:            c.department,
  position:              c.position,
  employment_type:       c.employmentType,
  date_hired:            c.dateHired,
  base_monthly:          Number(c.baseMonthly ?? 0),
  check_in_time:         c.checkInTime,
  late_threshold_mins:   c.lateThresholdMins,
  working_days_per_week: c.workingDaysPerWeek,
  leave_pay_policy:      c.leavePayPolicy,
  leave_pay_weight:      c.leavePayWeight,
  is_active:             c.isActive,
  created_at:            c.createdAt,
  updated_at:            c.updatedAt,
  employee:              c.employee ? normalizeEmployeeRef(c.employee) : null,
});

// Minimal employee reference — used inside HR types only.
// Full employee data comes from fetchEmployeesService.
const normalizeEmployeeRef = (e) => ({
  id:    e.id,
  name:  e.name,
  email: e.email,
  phone: e.phone ?? null,
});

// Full employee normalizer — used by fetchEmployeesService.
// contract is null here, merged in HRContext.loadEmployees.
const normalizeEmployee = (e) => ({
  id:       e.id,
  name:     e.name,
  email:    e.email,
  phone:    e.phone ?? null,
  contract: null,
});

const normalizeAttendance = (a) => ({
  id:               a.id,
  date:             a.date,
  time_in:          a.timeIn ?? null,
  time_out:         a.timeOut ?? null,
  status:           a.status,
  source:           a.source,
  notes:            a.notes ?? null,
  created_at:       a.createdAt,
  updated_at:       a.updatedAt,
  attendance_weight: a.attendanceWeight,
  employee:         a.employee ? normalizeEmployeeRef(a.employee) : null,
  recorded_by:      a.recordedBy ? normalizeEmployeeRef(a.recordedBy) : null,
});

const normalizeLeaveRequest = (l) => ({
  id:           l.id,
  leave_type:   l.leaveType,
  start_date:   l.startDate,
  end_date:     l.endDate,
  total_days:   l.totalDays,
  reason:       l.reason ?? null,
  status:       l.status,
  reviewed_at:  l.reviewedAt ?? null,
  review_notes: l.reviewNotes ?? null,
  created_at:   l.createdAt,
  employee:     l.employee ? normalizeEmployeeRef(l.employee) : null,
  reviewed_by:  l.reviewedBy ? normalizeEmployeeRef(l.reviewedBy) : null,
});

const normalizeSalaryRecord = (r) => ({
  id:            r.id,
  period_year:   r.periodYear,
  period_month:  r.periodMonth,
  period_label:  r.periodLabel,
  base_monthly:  Number(r.baseMonthly ?? 0),
  working_days:  r.workingDays,
  days_present:  Number(r.daysPresent ?? 0),
  days_on_leave: Number(r.daysOnLeave ?? 0),
  gross_amount:  Number(r.grossAmount ?? 0),
  deductions:    Number(r.deductions ?? 0),
  net_amount:    Number(r.netAmount ?? 0),
  total_paid:    Number(r.totalPaid ?? 0),
  balance:       Number(r.balance ?? 0),
  status:        r.status,
  is_fully_paid: r.isFullyPaid,
  approved_at:   r.approvedAt ?? null,
  created_at:    r.createdAt,
  employee:      r.employee ? normalizeEmployeeRef(r.employee) : null,
  approved_by:   r.approvedBy ? normalizeEmployeeRef(r.approvedBy) : null,
  payments:      (r.payments ?? []).map(normalizeSalaryPayment),
});

const normalizeSalaryPayment = (p) => ({
  id:             p.id,
  amount:         Number(p.amount ?? 0),
  payment_method: p.paymentMethod,
  reference:      p.reference ?? null,
  notes:          p.notes ?? null,
  paid_at:        p.paidAt,
  paid_by:        p.paidBy ? normalizeEmployeeRef(p.paidBy) : null,
});


// ======================================================
// SHARED FIELD FRAGMENTS
// ======================================================

// HR types return HREmployeeRef — only id, name, email
const HR_EMPLOYEE_REF = `id name email`;

const CONTRACT_FIELDS = `
  id
  department
  position
  employmentType
  dateHired
  baseMonthly
  checkInTime
  lateThresholdMins
  workingDaysPerWeek
  leavePayPolicy
  leavePayWeight
  isActive
  createdAt
  updatedAt
  employee { ${HR_EMPLOYEE_REF} phone }
`;

const ATTENDANCE_FIELDS = `
  id
  date
  timeIn
  timeOut
  status
  source
  notes
  createdAt
  updatedAt
  attendanceWeight
  employee { ${HR_EMPLOYEE_REF} }
  recordedBy { ${HR_EMPLOYEE_REF} }
`;

const LEAVE_FIELDS = `
  id
  leaveType
  startDate
  endDate
  totalDays
  reason
  status
  reviewedAt
  reviewNotes
  createdAt
  employee { ${HR_EMPLOYEE_REF} }
  reviewedBy { ${HR_EMPLOYEE_REF} }
`;

const SALARY_FIELDS = `
  id
  periodYear
  periodMonth
  periodLabel
  baseMonthly
  workingDays
  daysPresent
  daysOnLeave
  grossAmount
  deductions
  netAmount
  totalPaid
  balance
  status
  isFullyPaid
  approvedAt
  createdAt
  employee { ${HR_EMPLOYEE_REF} }
  approvedBy { ${HR_EMPLOYEE_REF} }
  payments {
    id amount paymentMethod reference notes paidAt
    paidBy { ${HR_EMPLOYEE_REF} }
  }
`;

const PAYMENT_FIELDS = `
  id
  amount
  paymentMethod
  reference
  notes
  paidAt
  paidBy { ${HR_EMPLOYEE_REF} }
`;


// ======================================================
// EMPLOYEES
// Fetches bare employee list — no contract field.
// Contract is fetched separately via fetchAllContractsService
// and merged by employee id in HRContext.loadEmployees.
// ======================================================

export const fetchEmployeesService = async () => {
  const data = await graphqlRequest(`
    query {
      employees {
        id name email phone
      }
    }
  `);
  return (data?.employees ?? []).map(normalizeEmployee);
};


// ======================================================
// CONTRACTS
// ======================================================

export const fetchAllContractsService = async (activeOnly = true) => {
  const data = await graphqlRequest(
    `
    query($activeOnly: Boolean!) {
      allContracts(activeOnly: $activeOnly) {
        ${CONTRACT_FIELDS}
      }
    }
  `,
    { activeOnly }
  );
  return (data?.allContracts ?? []).map(normalizeContract);
};

export const fetchMyContractService = async () => {
  const data = await graphqlRequest(`
    query {
      myContract {
        ${CONTRACT_FIELDS}
      }
    }
  `);
  return data?.myContract ? normalizeContract(data.myContract) : null;
};

export const createContractService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: CreateContractInput!) {
      createContract(input: $input) {
        ${CONTRACT_FIELDS}
      }
    }
  `,
    {
      input: {
        employeeId:          String(input.employee_id),
        department:          input.department,
        position:            input.position,
        employmentType:      input.employment_type,
        dateHired:           input.date_hired,
        baseMonthly:         Number(input.base_monthly),
        checkInTime:         input.check_in_time,
        lateThresholdMins:   input.late_threshold_mins ?? 15,
        workingDaysPerWeek:  input.working_days_per_week ?? 5,
        leavePayPolicy:      input.leave_pay_policy ?? "FULL_PAY",
      },
    }
  );
  return normalizeContract(data.createContract);
};

export const updateContractService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: UpdateContractInput!) {
      updateContract(input: $input) {
        ${CONTRACT_FIELDS}
      }
    }
  `,
    {
      input: {
        contractId:          String(input.contract_id),
        department:          input.department ?? null,
        position:            input.position ?? null,
        employmentType:      input.employment_type ?? null,
        baseMonthly:         input.base_monthly ?? null,
        checkInTime:         input.check_in_time ?? null,
        lateThresholdMins:   input.late_threshold_mins ?? null,
        workingDaysPerWeek:  input.working_days_per_week ?? null,
        leavePayPolicy:      input.leave_pay_policy ?? null,
        isActive:            input.is_active ?? null,
      },
    }
  );
  return normalizeContract(data.updateContract);
};


// ======================================================
// ATTENDANCE
// ======================================================

export const fetchTodayAttendanceService = async () => {
  const data = await graphqlRequest(`
    query {
      todayAttendance {
        ${ATTENDANCE_FIELDS}
      }
    }
  `);
  return (data?.todayAttendance ?? []).map(normalizeAttendance);
};

export const fetchEmployeeAttendanceService = async (
  employeeId,
  year,
  month,
) => {
  const data = await graphqlRequest(
    `
    query($employeeId: ID!, $year: Int!, $month: Int!) {
      employeeAttendance(employeeId: $employeeId, year: $year, month: $month) {
        ${ATTENDANCE_FIELDS}
      }
    }
  `,
    { employeeId: String(employeeId), year, month }
  );
  return (data?.employeeAttendance ?? []).map(normalizeAttendance);
};

export const fetchMyAttendanceService = async (year, month) => {
  const data = await graphqlRequest(
    `
    query($year: Int!, $month: Int!) {
      myAttendance(year: $year, month: $month) {
        ${ATTENDANCE_FIELDS}
      }
    }
  `,
    { year, month }
  );
  return (data?.myAttendance ?? []).map(normalizeAttendance);
};

export const selfCheckInService = async () => {
  const data = await graphqlRequest(`
    mutation {
      selfCheckIn {
        ${ATTENDANCE_FIELDS}
      }
    }
  `);
  return normalizeAttendance(data.selfCheckIn);
};

export const selfCheckOutService = async () => {
  const data = await graphqlRequest(`
    mutation {
      selfCheckOut {
        ${ATTENDANCE_FIELDS}
      }
    }
  `);
  return normalizeAttendance(data.selfCheckOut);
};

export const recordAttendanceService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: RecordAttendanceInput!) {
      recordAttendance(input: $input) {
        ${ATTENDANCE_FIELDS}
      }
    }
  `,
    {
      input: {
        employeeId:     String(input.employee_id),
        attendanceDate: input.attendance_date,
        status:         input.status,
        timeIn:         input.time_in ?? null,
        timeOut:        input.time_out ?? null,
        notes:          input.notes ?? null,
      },
    }
  );
  return normalizeAttendance(data.recordAttendance);
};

export const managerCheckOutService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: ManagerCheckOutInput!) {
      managerCheckOut(input: $input) {
        ${ATTENDANCE_FIELDS}
      }
    }
  `,
    {
      input: {
        employeeId:     String(input.employee_id),
        attendanceDate: input.attendance_date,
        timeOut:        input.time_out,
      },
    }
  );
  return normalizeAttendance(data.managerCheckOut);
};


// ======================================================
// LEAVE REQUESTS
// ======================================================

export const fetchLeaveRequestsService = async ({
  status      = null,
  employee_id = null,
} = {}) => {
  const data = await graphqlRequest(
    `
    query($status: String, $employeeId: ID) {
      leaveRequests(status: $status, employeeId: $employeeId) {
        ${LEAVE_FIELDS}
      }
    }
  `,
    {
      status:     status ?? null,
      employeeId: employee_id ? String(employee_id) : null,
    }
  );
  return (data?.leaveRequests ?? []).map(normalizeLeaveRequest);
};

export const fetchMyLeaveRequestsService = async () => {
  const data = await graphqlRequest(`
    query {
      myLeaveRequests {
        ${LEAVE_FIELDS}
      }
    }
  `);
  return (data?.myLeaveRequests ?? []).map(normalizeLeaveRequest);
};

export const requestLeaveService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: RequestLeaveInput!) {
      requestLeave(input: $input) {
        ${LEAVE_FIELDS}
      }
    }
  `,
    {
      input: {
        leaveType: input.leave_type,
        startDate: input.start_date,
        endDate:   input.end_date,
        reason:    input.reason ?? null,
      },
    }
  );
  return normalizeLeaveRequest(data.requestLeave);
};

export const reviewLeaveService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: ReviewLeaveInput!) {
      reviewLeave(input: $input) {
        ${LEAVE_FIELDS}
      }
    }
  `,
    {
      input: {
        leaveRequestId: String(input.leave_request_id),
        status:         input.status,
        reviewNotes:    input.review_notes ?? null,
      },
    }
  );
  return normalizeLeaveRequest(data.reviewLeave);
};


// ======================================================
// SALARY RECORDS
// ======================================================

export const fetchSalaryRecordsService = async ({
  year        = null,
  month       = null,
  employee_id = null,
  status      = null,
} = {}) => {
  const data = await graphqlRequest(
    `
    query($year: Int, $month: Int, $employeeId: ID, $status: String) {
      salaryRecords(
        year: $year
        month: $month
        employeeId: $employeeId
        status: $status
      ) {
        ${SALARY_FIELDS}
      }
    }
  `,
    {
      year:       year ?? null,
      month:      month ?? null,
      employeeId: employee_id ? String(employee_id) : null,
      status:     status ?? null,
    }
  );
  return (data?.salaryRecords ?? []).map(normalizeSalaryRecord);
};

export const fetchMyPayslipsService = async (year = null) => {
  const data = await graphqlRequest(
    `
    query($year: Int) {
      myPayslips(year: $year) {
        ${SALARY_FIELDS}
      }
    }
  `,
    { year: year ?? null }
  );
  return (data?.myPayslips ?? []).map(normalizeSalaryRecord);
};

export const fetchSalaryPaymentsService = async (salaryRecordId) => {
  const data = await graphqlRequest(
    `
    query($salaryRecordId: ID!) {
      salaryPayments(salaryRecordId: $salaryRecordId) {
        ${PAYMENT_FIELDS}
      }
    }
  `,
    { salaryRecordId: String(salaryRecordId) }
  );
  return (data?.salaryPayments ?? []).map(normalizeSalaryPayment);
};

export const generatePayslipService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: GeneratePayslipInput!) {
      generatePayslip(input: $input) {
        ${SALARY_FIELDS}
      }
    }
  `,
    {
      input: {
        employeeId: String(input.employee_id),
        year:       input.year,
        month:      input.month,
        deductions: Number(input.deductions ?? 0),
      },
    }
  );
  return normalizeSalaryRecord(data.generatePayslip);
};

export const approvePayslipService = async (salaryRecordId) => {
  const data = await graphqlRequest(
    `
    mutation($salaryRecordId: ID!) {
      approvePayslip(salaryRecordId: $salaryRecordId) {
        ${SALARY_FIELDS}
      }
    }
  `,
    { salaryRecordId: String(salaryRecordId) }
  );
  return normalizeSalaryRecord(data.approvePayslip);
};

export const addSalaryPaymentService = async (input) => {
  const data = await graphqlRequest(
    `
    mutation($input: AddSalaryPaymentInput!) {
      addSalaryPayment(input: $input) {
        ${PAYMENT_FIELDS}
      }
    }
  `,
    {
      input: {
        salaryRecordId: String(input.salary_record_id),
        amount:         Number(input.amount),
        paymentMethod:  input.payment_method,
        reference:      input.reference ?? null,
        notes:          input.notes ?? null,
      },
    }
  );
  return normalizeSalaryPayment(data.addSalaryPayment);
};