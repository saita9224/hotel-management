// app/models/Order.js
export default {
  id: String,             // unique order ID
  userId: String,         // employee who took the order
  items: [
    {
      name: String,       // e.g. "Ugali Fry"
      quantity: Number,
      price: Number,
      total: Number,
    },
  ],
  grandTotal: Number,
  date: Date,
};
