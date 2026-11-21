import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class PnL extends Model {
  static table = 'pnls';

  @field('period_start') periodStartStr;
  get periodStart() { return new Date(this.periodStartStr); }
  @field('period_end') periodEndStr;
  get periodEnd() { return new Date(this.periodEndStr); }
  @field('revenue')     revenue;
  @field('cogs')        cogs;
  @field('expenses')    expenses;
  @field('net_income')  netIncome;
}
