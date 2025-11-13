// app/models/Expense.js
export default function makeExpense({
  id = Date.now().toString(),
  product_id, // 🔹 stays constant for similar products (e.g. “Sugar”)
  group_id,   // 🔹 unique per transaction (used for payment tracking)
  description = "Expense",
  supplier = "", // 🔹 new optional field
  total_amount = 0,
  paid = 0,
  quantity = 0,
  unit_price = 0,
  date = new Date().toDateString(),
}) {
  return {
    id: id.toString(),
    product_id: product_id || description.toLowerCase().replace(/\s+/g, "-"), // auto-generate if missing
    group_id,
    supplier,
    description,
    total_amount: Number(total_amount) || Number(quantity) * Number(unit_price) || 0,
    paid: Number(paid) || 0,
    quantity: Number(quantity) || 0,
    unit_price: Number(unit_price) || 0,
    date,
  };
}
