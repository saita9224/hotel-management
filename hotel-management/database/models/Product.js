// database/models/Product.js
import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export class ProductModel extends Model {
  static table = 'products';
  static associations = {
    order_items: { type: 'has_many', foreignKey: 'product_id' },
    expenses: { type: 'has_many', foreignKey: 'product_id' },
  };

  @field('name') name;
  @field('category_id') categoryId;
  @field('unit') unit;
  @field('current_stock') currentStock;
  @field('auto_deduct_on_sale') autoDeductOnSale;
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;

  // Relations
  @children('order_items') orderItems;
  @children('expenses') expenses;
}

