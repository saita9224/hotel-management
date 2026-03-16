// services/posService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeSession = (s) => ({
  id:           s.id,
  opened_at:    s.openedAt,
  closed_at:    s.closedAt ?? null,
  opening_cash: Number(s.openingCash ?? 0),
  closing_cash: s.closingCash ? Number(s.closingCash) : null,
  is_active:    s.isActive,
  employee:     s.employee,
});

const normalizeReceipt = (r) => ({
  id:             r.id,
  receipt_number: r.receiptNumber,
  subtotal:       Number(r.subtotal ?? 0),
  discount:       Number(r.discount ?? 0),
  total:          Number(r.total ?? 0),
  balance:        Number(r.balance ?? 0),
  status:         r.status,
  table_note:     r.tableNote ?? "",
  created_at:     r.createdAt,
  submitted_at:   r.submittedAt ?? null,
  created_by:     r.createdBy ?? null,
  orders:         (r.orders ?? []).map(normalizeOrder),
  payments:       (r.payments ?? []).map(normalizePayment),
  credit:         r.credit ? normalizeCredit(r.credit) : null,
});

const normalizeOrder = (o) => ({
  id:          o.id,
  is_saved:    o.isSaved,
  is_refunded: o.isRefunded,
  created_at:  o.createdAt,
  created_by:  o.createdBy ?? null,
  items:       (o.items ?? []).map(normalizeOrderItem),
});

const normalizeOrderItem = (i) => ({
  id:                   i.id,
  product_id:           i.productId,
  product_name:         i.productName,
  quantity:             Number(i.quantity ?? 0),
  listed_price:         Number(i.listedPrice ?? 0),
  final_price:          Number(i.finalPrice ?? 0),
  line_total:           Number(i.lineTotal ?? 0),
  price_overridden:     i.priceOverridden,
  price_override_reason: i.priceOverrideReason ?? null,
});

const normalizePayment = (p) => ({
  id:          p.id,
  method:      p.method,
  amount:      Number(p.amount ?? 0),
  created_at:  p.createdAt,
  received_by: p.receivedBy ?? null,
});

const normalizeCredit = (c) => ({
  id:             c.id,
  customer_name:  c.customerName,
  customer_phone: c.customerPhone ?? null,
  credit_amount:  Number(c.creditAmount ?? 0),
  due_date:       c.dueDate,
  is_settled:     c.isSettled,
  settled_at:     c.settledAt ?? null,
  approved_by:    c.approvedBy ?? null,
  settled_by:     c.settledBy ?? null,
});

const RECEIPT_FIELDS = `
  id
  receiptNumber
  subtotal
  discount
  total
  balance
  status
  tableNote
  createdAt
  submittedAt
  createdBy { id name }
  orders {
    id
    isSaved
    isRefunded
    createdAt
    items {
      id
      productId
      productName
      quantity
      listedPrice
      finalPrice
      lineTotal
      priceOverridden
      priceOverrideReason
    }
  }
  payments {
    id
    method
    amount
    createdAt
    receivedBy { id name }
  }
  credit {
    id
    customerName
    customerPhone
    creditAmount
    dueDate
    isSettled
    settledAt
    approvedBy { id name }
    settledBy  { id name }
  }
`;

const CREDIT_FIELDS = `
  id
  customerName
  customerPhone
  creditAmount
  dueDate
  isSettled
  settledAt
  approvedBy { id name }
  settledBy  { id name }
`;


// ======================================================
// SESSION
// ======================================================

export const fetchActiveSession = async () => {
  const data = await graphqlRequest(`
    query {
      activePosSession {
        id openedAt closedAt openingCash closingCash isActive
        employee { id name }
      }
    }
  `);
  return data?.activePosSession ? normalizeSession(data.activePosSession) : null;
};

export const openSessionService = async (openingCash = 0) => {
  const data = await graphqlRequest(
    `mutation($input: OpenSessionInput!) {
      openPosSession(input: $input) {
        id openedAt openingCash isActive
        employee { id name }
      }
    }`,
    { input: { openingCash: Number(openingCash) } }
  );
  return normalizeSession(data.openPosSession);
};

export const closeSessionService = async (sessionId, closingCash) => {
  const data = await graphqlRequest(
    `mutation($input: CloseSessionInput!) {
      closePosSession(input: $input) {
        id closedAt closingCash isActive
      }
    }`,
    { input: { sessionId: String(sessionId), closingCash: Number(closingCash) } }
  );
  return normalizeSession(data.closePosSession);
};


// ======================================================
// RECEIPTS
// ======================================================

export const createReceiptService = async ({
  session_id,
  discount   = 0,
  table_note = "",
}) => {
  const data = await graphqlRequest(
    `mutation($input: CreateReceiptInput!) {
      createReceipt(input: $input) { ${RECEIPT_FIELDS} }
    }`,
    {
      input: {
        sessionId:  String(session_id),
        discount:   Number(discount),
        tableNote:  table_note,
      },
    }
  );
  return normalizeReceipt(data.createReceipt);
};

export const fetchReceiptsBySession = async (sessionId) => {
  const data = await graphqlRequest(
    `query($sessionId: ID!) {
      receiptsBySession(sessionId: $sessionId) { ${RECEIPT_FIELDS} }
    }`,
    { sessionId: String(sessionId) }
  );
  return (data?.receiptsBySession ?? []).map(normalizeReceipt);
};

export const fetchMyPendingReceipts = async (sessionId) => {
  const data = await graphqlRequest(
    `query($sessionId: ID!) {
      myPendingReceipts(sessionId: $sessionId) { ${RECEIPT_FIELDS} }
    }`,
    { sessionId: String(sessionId) }
  );
  return (data?.myPendingReceipts ?? []).map(normalizeReceipt);
};

export const fetchReceiptByNumber = async (receiptNumber) => {
  const data = await graphqlRequest(
    `query($receiptNumber: String!) {
      receiptByNumber(receiptNumber: $receiptNumber) { ${RECEIPT_FIELDS} }
    }`,
    { receiptNumber }
  );
  return data?.receiptByNumber ? normalizeReceipt(data.receiptByNumber) : null;
};

export const fetchReceiptById = async (receiptId) => {
  const data = await graphqlRequest(
    `query($receiptId: ID!) {
      receipt(receiptId: $receiptId) { ${RECEIPT_FIELDS} }
    }`,
    { receiptId: String(receiptId) }
  );
  return data?.receipt ? normalizeReceipt(data.receipt) : null;
};

export const fetchCashierQueue = async (sessionId = null) => {
  const data = await graphqlRequest(
    `query($sessionId: ID) {
      cashierQueue(sessionId: $sessionId) { ${RECEIPT_FIELDS} }
    }`,
    { sessionId: sessionId ? String(sessionId) : null }
  );
  return (data?.cashierQueue ?? []).map(normalizeReceipt);
};

export const fetchOpenReceipts = async (sessionId = null) => {
  const data = await graphqlRequest(
    `query($sessionId: ID) {
      openReceipts(sessionId: $sessionId) { ${RECEIPT_FIELDS} }
    }`,
    { sessionId: sessionId ? String(sessionId) : null }
  );
  return (data?.openReceipts ?? []).map(normalizeReceipt);
};


// ======================================================
// ORDERS
// ======================================================

export const createOrderService = async (receiptId) => {
  const data = await graphqlRequest(
    `mutation($receiptId: ID!) {
      createOrder(receiptId: $receiptId) {
        id isSaved isRefunded createdAt
        items {
          id productId productName quantity
          listedPrice finalPrice lineTotal
        }
      }
    }`,
    { receiptId: String(receiptId) }
  );
  return normalizeOrder(data.createOrder);
};

export const addOrderItemService = async ({
  order_id,
  product_id,
  quantity,
  final_price,
  price_override_reason = null,
}) => {
  const data = await graphqlRequest(
    `mutation($input: AddOrderItemInput!) {
      addOrderItem(input: $input) {
        id productId productName quantity
        listedPrice finalPrice lineTotal
        priceOverridden priceOverrideReason
      }
    }`,
    {
      input: {
        orderId:              String(order_id),
        productId:            String(product_id),
        quantity:             Number(quantity),
        finalPrice:           Number(final_price),
        priceOverrideReason:  price_override_reason,
      },
    }
  );
  return normalizeOrderItem(data.addOrderItem);
};

export const addMenuOrderItemService = async ({
  order_id,
  menu_item_id,
  quantity,
}) => {
  const data = await graphqlRequest(
    `mutation($input: AddMenuOrderItemInput!) {
      addMenuOrderItem(input: $input) {
        id productId productName quantity
        listedPrice finalPrice lineTotal
        priceOverridden priceOverrideReason
      }
    }`,
    {
      input: {
        orderId:    String(order_id),
        menuItemId: String(menu_item_id),
        quantity:   Number(quantity),
      },
    }
  );
  return normalizeOrderItem(data.addMenuOrderItem);
};


// ======================================================
// SUBMIT ORDER
// Two-step: mutate (side effects) then re-fetch (fresh dataloader)
// ======================================================

export const submitOrderService = async (receiptId) => {
  await graphqlRequest(
    `mutation($receiptId: ID!) {
      submitOrder(receiptId: $receiptId) {
        id status subtotal total submittedAt
      }
    }`,
    { receiptId: String(receiptId) }
  );
  return fetchReceiptById(receiptId);
};


// ======================================================
// RECALL ORDER
// ======================================================

export const recallOrderService = async (receiptId) => {
  await graphqlRequest(
    `mutation($receiptId: ID!) {
      recallOrder(receiptId: $receiptId) {
        id status submittedAt
      }
    }`,
    { receiptId: String(receiptId) }
  );
  return fetchReceiptById(receiptId);
};


// ======================================================
// PAYMENT
// ======================================================

export const acceptPaymentService = async ({ receipt_id, amount, method }) => {
  const data = await graphqlRequest(
    `mutation($input: AcceptPaymentInput!) {
      acceptPayment(input: $input) {
        id method amount createdAt
        receivedBy { id name }
      }
    }`,
    {
      input: {
        receiptId: String(receipt_id),
        amount:    Number(amount),
        method,
      },
    }
  );
  return normalizePayment(data.acceptPayment);
};


// ======================================================
// CREDIT
// ======================================================

export const createCreditService = async ({
  receipt_id,
  customer_name,
  customer_phone = null,
  due_date,
}) => {
  const data = await graphqlRequest(
    `mutation($input: CreateCreditInput!) {
      createCredit(input: $input) { ${CREDIT_FIELDS} }
    }`,
    {
      input: {
        receiptId:     String(receipt_id),
        customerName:  customer_name,
        customerPhone: customer_phone,
        dueDate:       due_date,
      },
    }
  );
  return normalizeCredit(data.createCredit);
};


// ======================================================
// SETTLE CREDIT
// ======================================================

export const settleCreditService = async ({ credit_id, amount, method }) => {
  const data = await graphqlRequest(
    `mutation($input: SettleCreditInput!) {
      settleCredit(input: $input) {
        id method amount createdAt
        receivedBy { id name }
      }
    }`,
    {
      input: {
        creditId: String(credit_id),
        amount:   Number(amount),
        method,
      },
    }
  );
  return normalizePayment(data.settleCredit);
};


// ======================================================
// UNSETTLED CREDITS
// ======================================================

export const fetchUnsettledCredits = async (overdueOnly = false) => {
  const data = await graphqlRequest(
    `query($overdueOnly: Boolean!) {
      unsettledCredits(overdueOnly: $overdueOnly) { ${CREDIT_FIELDS} }
    }`,
    { overdueOnly }
  );
  return (data?.unsettledCredits ?? []).map(normalizeCredit);
};


// ======================================================
// REFUND
// ======================================================

export const refundReceiptService = async ({ receipt_id, reason }) => {
  await graphqlRequest(
    `mutation($input: RefundReceiptInput!) {
      refundReceipt(input: $input) {
        id status refundReason refundedAt
      }
    }`,
    {
      input: {
        receiptId: String(receipt_id),
        reason,
      },
    }
  );
  return fetchReceiptById(receipt_id);
};