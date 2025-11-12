// app/models/InventoryDeduction.js
export default {
  id: String,
  userId: String,           // who recorded it
  itemName: String,         // name from inventory
  quantityUsed: Number,
  reason: String,           // e.g. "Prepared lunch orders", "Staff meal"
  date: Date,
};
