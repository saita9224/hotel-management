// database/models/Receipt.js
import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export class ReceiptModel extends Model {
  static table = 'receipts';
  static associations = {
    orders: { type: 'has_many', foreignKey: 'receipt_id' },
  };

  @field('session_id') sessionId;
  @field('receipt_number') receiptNumber;
  @field('subtotal') subtotal;
  @field('discount') discount;
  @field('total') total;
  @field('balance') balance;
  @field('status') status;
  @field('table_note') tableNote;
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;

  @children('orders') orders;
}
