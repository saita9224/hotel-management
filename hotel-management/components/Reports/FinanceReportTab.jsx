// components/Reports/FinanceReportTab.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { useTheme } from "../../hooks/useTheme";
import { useFinance } from "../../hooks/useFinance";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const SCREEN_WIDTH = Dimensions.get("window").width;

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const SUB_TABS = [
  { key: "pnl", label: "Profit & Loss", icon: "trending-up-outline" },
  { key: "balance", label: "Balance Sheet", icon: "scale-outline" },
  { key: "aging", label: "Aging / Debts", icon: "time-outline" },
];

export default function FinanceReportTab({ startDate, endDate }) {
  const { colors } = useTheme();
  const [subTab, setSubTab] = useState("pnl");

  const reportsContext = useReports();
  const creditReport = reportsContext?.creditReport;
  const loadCreditReport = reportsContext?.loadCreditReport;

  React.useEffect(() => {
    if (subTab === "aging" && loadCreditReport) {
      loadCreditReport();
    }
  }, [subTab, loadCreditReport]);

  const {
    pnl,
    balance,
    aging,
    loading,
    error,
    permissionDenied,
    refresh,
  } = useFinance(startDate, endDate);

  // ── 1. Permission Denied View ──────────────────────────────
  if (permissionDenied) {
    return (
      <View style={styles.centerContainer}>
        <View style={[styles.lockedBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={48} color="#FF453A" style={{ marginBottom: 12 }} />
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.lockedSub, { color: colors.tabBarInactive }]}>
            You require the <Text style={{ fontWeight: "700", color: colors.text }}>FINANCE_VIEW</Text> permission to
            inspect financial records, balance sheets, and debt aging reports.
          </Text>
        </View>
      </View>
    );
  }

  // ── 2. Loading State ───────────────────────────────────────
  if (loading && !pnl && !balance) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.tabBarInactive }]}>
          Loading financial data...
        </Text>
      </View>
    );
  }

  // ── 3. Error State ─────────────────────────────────────────
  if (error && !pnl) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load records</Text>
        <Text style={[styles.errorSub, { color: colors.tabBarInactive }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={refresh}
        >
          <Text style={{ color: "#FFF", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Calculations for P&L ──────────────────────────────────
  const revenue = pnl?.revenue ?? 0;
  const cogs = pnl?.cogs ?? 0;
  const grossProfit = revenue - cogs;
  const expenses = pnl?.expenses ?? 0;
  const netIncome = pnl?.net_income ?? (grossProfit - expenses);
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";
  const netMargin = revenue > 0 ? ((netIncome / revenue) * 100).toFixed(1) : "0.0";

  // ── Chart configuration ───────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: () => colors.accent,
    labelColor: () => colors.tabBarInactive,
    propsForBackgroundLines: { stroke: colors.border },
  };

  const pnlChartData = {
    labels: ["Revenue", "COGS", "Expenses", "Net"],
    datasets: [
      {
        data: [
          Math.max(0, revenue),
          Math.max(0, cogs),
          Math.max(0, expenses),
          Math.max(0, netIncome),
        ],
      },
    ],
  };

  // ── RENDER SUB PANELS ─────────────────────────────────────

  const renderPnLPanel = () => (
    <View>
      {/* 4 Main Summary Cards */}
      <View style={styles.cardRow}>
        <StatCard
          label="Total Revenue"
          value={`KES ${formatKES(revenue)}`}
          icon="cash-outline"
          color="#30D158"
        />
        <StatCard
          label="COGS"
          value={`KES ${formatKES(cogs)}`}
          icon="cart-outline"
          color="#FF9F0A"
        />
      </View>
      <View style={[styles.cardRow, { marginTop: 10 }]}>
        <StatCard
          label="Expenses"
          value={`KES ${formatKES(expenses)}`}
          icon="receipt-outline"
          color="#FF453A"
        />
        <StatCard
          label="Net Profit"
          value={`KES ${formatKES(netIncome)}`}
          icon="trending-up-outline"
          color={netIncome >= 0 ? "#30D158" : "#FF453A"}
          subtitle={`${netMargin}% margin`}
        />
      </View>

      {/* Visual Chart */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Income Statement Breakdown</Text>
        <BarChart
          data={pnlChartData}
          width={SCREEN_WIDTH - 64}
          height={200}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          style={styles.chart}
        />
      </View>

      {/* Detailed P&L statement table */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Summary</Text>
        
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { color: colors.text }]}>Gross Revenue</Text>
          <Text style={[styles.tableValue, { color: "#30D158" }]}>KES {formatKES(revenue)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { color: colors.text }]}>Cost of Goods Sold (COGS)</Text>
          <Text style={[styles.tableValue, { color: "#FF9F0A" }]}>- KES {formatKES(cogs)}</Text>
        </View>

        <View style={[styles.tableRow, styles.dividerRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableLabelBold, { color: colors.text }]}>Gross Profit ({grossMargin}%)</Text>
          <Text style={[styles.tableValueBold, { color: grossProfit >= 0 ? "#30D158" : "#FF453A" }]}>
            KES {formatKES(grossProfit)}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, { color: colors.text }]}>Operating Expenses</Text>
          <Text style={[styles.tableValue, { color: "#FF453A" }]}>- KES {formatKES(expenses)}</Text>
        </View>

        <View style={[styles.tableRow, styles.totalRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.tableLabelBold, { color: colors.text, fontSize: 15 }]}>Net Income</Text>
          <Text style={[styles.tableValueBold, { color: netIncome >= 0 ? "#30D158" : "#FF453A", fontSize: 16 }]}>
            KES {formatKES(netIncome)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBalancePanel = () => {
    const assets = balance?.assets || {};
    const liabilities = balance?.liabilities || {};
    const equity = balance?.equity ?? 0;

    const assetEntries = Object.entries(assets);
    const liabilityEntries = Object.entries(liabilities);

    const totalAssets = assetEntries.reduce((sum, [, v]) => sum + Number(v || 0), 0);
    const totalLiabilities = liabilityEntries.reduce((sum, [, v]) => sum + Number(v || 0), 0);

    return (
      <View>
        {/* Working Capital Stat Card */}
        <View style={styles.cardRow}>
          <StatCard
            label="Total Assets"
            value={`KES ${formatKES(totalAssets)}`}
            icon="wallet-outline"
            color="#30D158"
          />
          <StatCard
            label="Total Liabilities"
            value={`KES ${formatKES(totalLiabilities)}`}
            icon="alert-circle-outline"
            color="#FF453A"
          />
        </View>
        <View style={[styles.cardRow, { marginTop: 10 }]}>
          <StatCard
            label="Working Capital (Equity)"
            value={`KES ${formatKES(equity || (totalAssets - totalLiabilities))}`}
            icon="shield-checkmark-outline"
            color="#0A84FF"
            subtitle="Assets − Liabilities"
          />
        </View>

        {/* Assets Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="cube-outline" size={18} color="#30D158" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 6 }]}>Assets</Text>
          </View>
          {assetEntries.length === 0 ? (
            <Text style={{ color: colors.tabBarInactive, marginVertical: 8 }}>No asset items recorded</Text>
          ) : (
            assetEntries.map(([name, val]) => (
              <View key={name} style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.text, textTransform: "capitalize" }]}>
                  {name.replace(/_/g, " ")}
                </Text>
                <Text style={[styles.tableValue, { color: colors.text }]}>KES {formatKES(val)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Liabilities Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="card-outline" size={18} color="#FF453A" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 6 }]}>Liabilities</Text>
          </View>
          {liabilityEntries.length === 0 ? (
            <Text style={{ color: colors.tabBarInactive, marginVertical: 8 }}>No outstanding liabilities</Text>
          ) : (
            liabilityEntries.map(([name, val]) => (
              <View key={name} style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.text, textTransform: "capitalize" }]}>
                  {name.replace(/_/g, " ")}
                </Text>
                <Text style={[styles.tableValue, { color: "#FF453A" }]}>KES {formatKES(val)}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  const renderAgingPanel = () => {
    const credits = aging?.credits || {};
    const payables = aging?.payables || {};

    const BUCKETS = [
      { key: "current", label: "Current (0-1 day)" },
      { key: "days_1_7", label: "1 – 7 Days" },
      { key: "days_8_30", label: "8 – 30 Days" },
      { key: "days_30_plus", label: "30+ Days (Overdue)" },
    ];

    const totalReceivables = Object.values(credits).reduce((sum, v) => sum + Number(v || 0), 0);
    const totalPayables = Object.values(payables).reduce((sum, v) => sum + Number(v || 0), 0);

    return (
      <View>
        <View style={styles.cardRow}>
          <StatCard
            label="Total Receivables"
            value={`KES ${formatKES(totalReceivables)}`}
            icon="arrow-down-circle-outline"
            color="#0A84FF"
            subtitle="Owed by customers"
          />
          <StatCard
            label="Total Payables"
            value={`KES ${formatKES(totalPayables)}`}
            icon="arrow-up-circle-outline"
            color="#FF9F0A"
            subtitle="Owed to suppliers"
          />
        </View>

        {/* Receivables Aging Buckets */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="people-outline" size={18} color="#0A84FF" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 6 }]}>
              Customer Receivables (Credits)
            </Text>
          </View>
          {BUCKETS.map((b) => {
            const amount = Number(credits[b.key] || 0);
            const isDanger = b.key === "days_30_plus" && amount > 0;
            return (
              <View key={b.key} style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.text }]}>{b.label}</Text>
                <Text style={[styles.tableValue, { color: isDanger ? "#FF453A" : colors.text, fontWeight: isDanger ? "700" : "500" }]}>
                  KES {formatKES(amount)}
                </Text>
              </View>
            );
          })}

          {/* Detailed Customer Credit Accounts */}
          {creditReport?.accounts?.length > 0 && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 }}>
              <Text style={[styles.tableLabelBold, { color: colors.text, marginBottom: 8 }]}>
                Customer Credit Accounts ({creditReport.accounts.length})
              </Text>
              {creditReport.accounts.map((item) => (
                <View
                  key={item.receipt_number}
                  style={[
                    styles.accountItem,
                    {
                      backgroundColor: item.is_overdue ? "#FF453A08" : colors.background,
                      borderColor: item.is_overdue ? "#FF453A" : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                      {item.customer_name}
                    </Text>
                    {item.customer_phone ? (
                      <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 1 }}>
                        {item.customer_phone}
                      </Text>
                    ) : null}
                    <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 1 }}>
                      {item.receipt_number}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                      KES {formatKES(item.credit_amount)}
                    </Text>
                    <View style={styles.dueDateRow}>
                      {item.is_overdue && (
                        <Ionicons name="alert-circle" size={12} color="#FF453A" />
                      )}
                      <Text
                        style={{
                          color: item.is_overdue ? "#FF453A" : colors.tabBarInactive,
                          fontSize: 11,
                          marginLeft: 4,
                          fontWeight: item.is_overdue ? "700" : "400",
                        }}
                      >
                        {item.is_overdue ? "OVERDUE · " : "Due: "}
                        {item.due_date}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payables Aging Buckets */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="business-outline" size={18} color="#FF9F0A" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 6 }]}>
              Supplier Payables (Expense Debt)
            </Text>
          </View>
          {BUCKETS.map((b) => {
            const amount = Number(payables[b.key] || 0);
            const isDanger = b.key === "days_30_plus" && amount > 0;
            return (
              <View key={b.key} style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.text }]}>{b.label}</Text>
                <Text style={[styles.tableValue, { color: isDanger ? "#FF453A" : colors.text, fontWeight: isDanger ? "700" : "500" }]}>
                  KES {formatKES(amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.accent]} />}
    >
      {/* Segmented Sub-Tab Switcher */}
      <View style={[styles.subTabWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {SUB_TABS.map((tab) => {
          const active = subTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.subTabButton,
                active && [styles.subTabButtonActive, { backgroundColor: colors.accent }],
              ]}
              onPress={() => setSubTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={active ? "#FFF" : colors.tabBarInactive}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.subTabText,
                  { color: active ? "#FFF" : colors.tabBarInactive },
                  active && { fontWeight: "700" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Render active sub-panel */}
      {subTab === "pnl" && renderPnLPanel()}
      {subTab === "balance" && renderBalancePanel()}
      {subTab === "aging" && renderAgingPanel()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  subTabWrap: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  subTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabButtonActive: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  subTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 10,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dividerRow: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
  },
  totalRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  tableLabel: {
    fontSize: 13,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  tableLabelBold: {
    fontSize: 14,
    fontWeight: "700",
  },
  tableValueBold: {
    fontSize: 14,
    fontWeight: "700",
  },
  centerContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  lockedBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    maxWidth: 340,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  lockedSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  errorSub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  accountItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
});
