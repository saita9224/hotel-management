// app/models/Expense.js

export default function makeExpense({
  // Unique ID for THIS specific expense entry
  id = `E-${Date.now()}-${Math.floor(Math.random() * 10000)}`,

  // Product ID — SAME for all entries of a product
  // Auto-generate if new product
  product_id = `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

  product_name = "Unknown Product",
  supplier = "",
  description = "Expense",

  quantity = 0,
  unit_price = 0,

  // total_amount can be provided or computed
  total_amount,

  // Payment
  paid = 0,

  // Timestamp — will be generated in add-expense screen
  timestamp = new Date().toISOString(),
}) {
  const qty = Number(quantity) || 0;
  const price = Number(unit_price) || 0;

  const amount =
    Number(total_amount) ||
    (qty > 0 && price > 0 ? qty * price : 0);

  return {
    id: id.toString(),
    product_id,
    product_name,
    supplier,
    description,

    quantity: qty,
    unit_price: price,
    total_amount: amount,

    paid: Number(paid) || 0,

    balance: amount - (Number(paid) || 0),

    timestamp, // ISO format: "2025-02-11T14:45:22.123Z"
  };
}
