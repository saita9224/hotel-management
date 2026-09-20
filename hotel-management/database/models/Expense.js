// database/models/Expense.js
import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export class ExpenseModel extends Model {
  static table = 'expenses';
  static associations = {
    products: { type: 'belongs_to', key: 'product_id' },
  };

  @field('product_id') productId;
  @field('item_name') itemName;
  @field('quantity') quantity;
  @field('unit_price') unitPrice;
  @field('total_price') totalPrice;
  @field('amount_paid') amountPaid;
  @field('balance') balance;
  @field('is_fully_paid') isFullyPaid;
  @field('supplier_name') supplierName;
  @date('created_at') createdAt;
  @date('updated_at') updatedAt;
  @field('synced') synced;

  @relation('products', 'product_id') product;
}

