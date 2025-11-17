// app/models/Inventory.js
// Represents both adding and deducting stock as transactions.

export default {
  id: String,        // unique transaction ID (UUID)
  productId: String, // matches product id in InventoryContext
  quantity: Number,  // positive = added, negative = deducted
  reason: String,    // optional: e.g., "Kitchen Usage", "Spoilage"
  userId: String,    // optional: who recorded it
  date: String,      // ISO timestamp: new Date().toISOString()
};
