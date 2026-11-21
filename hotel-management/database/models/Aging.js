import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Aging extends Model {
  static table = 'agings';

  @field('timestamp') timestampStr;
  get timestamp() { return new Date(this.timestampStr); }
  @field('credits')   credits;   // JSON stringified list or map
  @field('payables')  payables;  // JSON stringified list or map
}