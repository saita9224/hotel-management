// database/models/Expense.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class ExpenseModel extends Model {
  static table = 'expenses';

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
}
