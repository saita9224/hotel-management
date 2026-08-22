// database/models/OrderItem.js
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class OrderItemModel extends Model {
  static table = 'order_items';

  @field('order_id') orderId;
  @field('product_id') productId;
  @field('product_name') productName;
  @field('quantity') quantity;
  @field('listed_price') listedPrice;
  @field('final_price') finalPrice;
  @field('line_total') lineTotal;
  @field('price_overridden') priceOverridden;
  @field('price_override_reason') priceOverrideReason;
}
