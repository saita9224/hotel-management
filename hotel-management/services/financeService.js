// services/financeService.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";

const API_ENV = process.env.EXPO_PUBLIC_API_ENV ?? "production";
const IS_LOCAL = API_ENV === "local";

const BASE_HOST = IS_LOCAL
  ? "172.22.236.69:8000"
  : "api.bizzman.hoppers.ink";

const PROTOCOL = IS_LOCAL ? "http" : "https";
const BASE_URL = `${PROTOCOL}://${BASE_HOST}`;

async function getAuthHeaders() {
  const pairs = await AsyncStorage.multiGet(["token", "schemaName"]);
  const token = pairs[0][1];
  const schemaName = pairs[1][1];

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (schemaName) {
    headers["X-Tenant"] = schemaName;
  }

  return headers;
}

export class FinancePermissionError extends Error {
  constructor(message = "You do not have permission to view finance reports.") {
    super(message);
    this.name = "FinancePermissionError";
    this.status = 403;
  }
}

// ============================================================================
// 1. API CALLS
// ============================================================================

export async function fetchPnLFromApi(startDate, endDate) {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/finance/pnl/?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`;

  const response = await fetch(url, { method: "GET", headers });

  if (response.status === 403) {
    throw new FinancePermissionError();
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch P&L: ${response.status}`);
  }

  const data = await response.json();
  return {
    revenue: Number(data.revenue ?? 0),
    cogs: Number(data.cogs ?? 0),
    expenses: Number(data.expenses ?? 0),
    net_income: Number(data.net_income ?? 0),
    period_start: startDate,
    period_end: endDate,
  };
}

export async function fetchBalanceFromApi(asOfDate) {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/finance/balance/?as_of=${encodeURIComponent(asOfDate)}`;

  const response = await fetch(url, { method: "GET", headers });

  if (response.status === 403) {
    throw new FinancePermissionError();
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Balance: ${response.status}`);
  }

  const data = await response.json();
  return {
    as_of: asOfDate,
    assets: typeof data.assets === "object" ? data.assets : {},
    liabilities: typeof data.liabilities === "object" ? data.liabilities : {},
    equity: Number(data.equity ?? 0),
  };
}

export async function fetchAgingFromApi() {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/finance/aging/`;

  const response = await fetch(url, { method: "GET", headers });

  if (response.status === 403) {
    throw new FinancePermissionError();
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Aging: ${response.status}`);
  }

  const data = await response.json();
  return {
    timestamp: new Date().toISOString(),
    credits: data.credits ?? data.receivables ?? data,
    payables: data.payables ?? data.suppliers ?? {},
  };
}

// ============================================================================
// 2. WATERMELONDB LOCAL CACHING
// ============================================================================

export async function saveFinanceCache({ pnl, balance, aging, startDate, endDate, asOfDate }) {
  await database.write(async () => {
    // 1. Cache PnL
    if (pnl) {
      const pnlCollection = database.get("pnls");
      const existingPnLs = await pnlCollection
        .query(
          Q.where("period_start", startDate),
          Q.where("period_end", endDate)
        )
        .fetch();

      if (existingPnLs.length > 0) {
        await existingPnLs[0].update((record) => {
          record.revenue = pnl.revenue;
          record.cogs = pnl.cogs;
          record.expenses = pnl.expenses;
          record.netIncome = pnl.net_income;
        });
      } else {
        await pnlCollection.create((record) => {
          record.periodStartStr = startDate;
          record.periodEndStr = endDate;
          record.revenue = pnl.revenue;
          record.cogs = pnl.cogs;
          record.expenses = pnl.expenses;
          record.netIncome = pnl.net_income;
        });
      }
    }

    // 2. Cache Balance
    if (balance) {
      const balanceCollection = database.get("balances");
      const existingBalances = await balanceCollection
        .query(Q.where("as_of", asOfDate))
        .fetch();

      const assetsStr = JSON.stringify(balance.assets || {});
      const liabilitiesStr = JSON.stringify(balance.liabilities || {});

      if (existingBalances.length > 0) {
        await existingBalances[0].update((record) => {
          record.assets = assetsStr;
          record.liabilities = liabilitiesStr;
          record.equity = balance.equity;
        });
      } else {
        await balanceCollection.create((record) => {
          record.asOfStr = asOfDate;
          record.assets = assetsStr;
          record.liabilities = liabilitiesStr;
          record.equity = balance.equity;
        });
      }
    }

    // 3. Cache Aging
    if (aging) {
      const agingCollection = database.get("agings");
      const creditsStr = JSON.stringify(aging.credits || {});
      const payablesStr = JSON.stringify(aging.payables || {});
      const nowStr = new Date().toISOString();

      const existingAgings = await agingCollection.query().fetch();
      if (existingAgings.length > 0) {
        await existingAgings[0].update((record) => {
          record.timestampStr = nowStr;
          record.credits = creditsStr;
          record.payables = payablesStr;
        });
      } else {
        await agingCollection.create((record) => {
          record.timestampStr = nowStr;
          record.credits = creditsStr;
          record.payables = payablesStr;
        });
      }
    }
  });
}

export async function getCachedFinanceData(startDate, endDate, asOfDate) {
  try {
    // 1. Query PnL
    const pnlCollection = database.get("pnls");
    const pnlMatches = await pnlCollection
      .query(
        Q.where("period_start", startDate),
        Q.where("period_end", endDate)
      )
      .fetch();

    let pnl = null;
    if (pnlMatches.length > 0) {
      const row = pnlMatches[0];
      pnl = {
        revenue: row.revenue,
        cogs: row.cogs,
        expenses: row.expenses,
        net_income: row.netIncome,
        period_start: row.periodStartStr,
        period_end: row.periodEndStr,
      };
    }

    // 2. Query Balance
    const balanceCollection = database.get("balances");
    const balanceMatches = await balanceCollection
      .query(Q.where("as_of", asOfDate))
      .fetch();

    let balance = null;
    if (balanceMatches.length > 0) {
      const row = balanceMatches[0];
      balance = {
        as_of: row.asOfStr,
        assets: row.assets ? JSON.parse(row.assets) : {},
        liabilities: row.liabilities ? JSON.parse(row.liabilities) : {},
        equity: row.equity,
      };
    }

    // 3. Query Aging
    const agingCollection = database.get("agings");
    const agings = await agingCollection.query().fetch();

    let aging = null;
    if (agings.length > 0) {
      const row = agings[0];
      aging = {
        timestamp: row.timestampStr,
        credits: row.credits ? JSON.parse(row.credits) : {},
        payables: row.payables ? JSON.parse(row.payables) : {},
      };
    }

    return { pnl, balance, aging };
  } catch (err) {
    console.error("Error reading cached finance data:", err);
    return { pnl: null, balance: null, aging: null };
  }
}

// ============================================================================
// 3. OFFLINE CALCULATION FROM WATERMELONDB LOCAL DATA (FALLBACK)
// ============================================================================

export async function calculateLocalFinanceData(startDate, endDate) {
  try {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(`${endDate}T23:59:59.999Z`).getTime();

    // 1. Receipts (Revenue)
    const receiptCollection = database.get("receipts");
    const allReceipts = await receiptCollection.query().fetch();

    let revenue = 0;
    let accountsReceivable = 0;
    let overdueReceivables = 0;

    const now = Date.now();
    const agingCredits = { current: 0, days_1_7: 0, days_8_30: 0, days_30_plus: 0 };

    for (const r of allReceipts) {
      const created = r.createdAt || r._raw.created_at;
      if (created >= startMs && created <= endMs) {
        if (r.status === "PAID") {
          revenue += Number(r.total || 0);
        }
      }

      // Unsettled credits / balances
      if (r.status === "CREDIT" || (r.balance && r.balance > 0)) {
        const bal = Number(r.balance || r.total || 0);
        accountsReceivable += bal;

        const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        if (ageDays <= 0) agingCredits.current += bal;
        else if (ageDays <= 7) agingCredits.days_1_7 += bal;
        else if (ageDays <= 30) agingCredits.days_8_30 += bal;
        else {
          agingCredits.days_30_plus += bal;
          overdueReceivables += bal;
        }
      }
    }

    // 2. Expenses
    const expenseCollection = database.get("expenses");
    const allExpenses = await expenseCollection.query().fetch();

    let expensesTotal = 0;
    let accountsPayable = 0;
    const agingPayables = { current: 0, days_1_7: 0, days_8_30: 0, days_30_plus: 0 };

    for (const exp of allExpenses) {
      const created = exp.createdAt || exp._raw.created_at;
      if (created >= startMs && created <= endMs) {
        expensesTotal += Number(exp.totalPrice || exp.amountPaid || 0);
      }

      const bal = Number(exp.balance || 0);
      if (bal > 0) {
        accountsPayable += bal;
        const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        if (ageDays <= 0) agingPayables.current += bal;
        else if (ageDays <= 7) agingPayables.days_1_7 += bal;
        else if (ageDays <= 30) agingPayables.days_8_30 += bal;
        else agingPayables.days_30_plus += bal;
      }
    }

    // 3. Products stock value (Assets)
    let inventoryVal = 0;
    try {
      const productCollection = database.get("products");
      const products = await productCollection.query().fetch();
      for (const p of products) {
        const stock = Number(p.currentStock || 0);
        const cost = Number(p.costPerUnit || p.listedPrice || 0);
        if (stock > 0 && cost > 0) inventoryVal += stock * cost;
      }
    } catch {}

    const cogs = 0; // Estimated/fallback
    const netIncome = revenue - cogs - expensesTotal;
    const cash = Math.max(0, revenue - expensesTotal);

    const pnl = {
      revenue,
      cogs,
      expenses: expensesTotal,
      net_income: netIncome,
      period_start: startDate,
      period_end: endDate,
    };

    const balance = {
      as_of: endDate,
      assets: {
        cash: cash.toFixed(2),
        inventory: inventoryVal.toFixed(2),
        accounts_receivable: accountsReceivable.toFixed(2),
      },
      liabilities: {
        accounts_payable: accountsPayable.toFixed(2),
      },
      equity: (cash + inventoryVal + accountsReceivable - accountsPayable),
    };

    const aging = {
      timestamp: new Date().toISOString(),
      credits: agingCredits,
      payables: agingPayables,
    };

    return { pnl, balance, aging };
  } catch (err) {
    console.error("Local calculation failed:", err);
    return {
      pnl: { revenue: 0, cogs: 0, expenses: 0, net_income: 0, period_start: startDate, period_end: endDate },
      balance: { as_of: endDate, assets: {}, liabilities: {}, equity: 0 },
      aging: { timestamp: new Date().toISOString(), credits: {}, payables: {} },
    };
  }
}
