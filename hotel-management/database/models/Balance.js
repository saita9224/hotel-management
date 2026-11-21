import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Balance extends Model {
  static table = 'balances';

  @field('as_of') asOfStr;
  get asOf() { return new Date(this.asOfStr); }
  @field('assets')   assets;
  @field('liabilities') liabilities;
  @field('equity')   equity;
}
