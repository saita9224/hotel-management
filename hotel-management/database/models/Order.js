// database/models/Order.js
import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export class OrderModel extends Model {
  static table = 'orders';
  static associations = {
    receipts: { type: 'belongs_to', key: 'receipt_id' },
    order_items: { type: 'has_many', foreignKey: 'order_id' },
  };

  @field('receipt_id') receiptId;
  @field('is_saved') isSaved;
  @field('is_refunded') isRefunded;
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;

  @children('order_items') orderItems;
}
