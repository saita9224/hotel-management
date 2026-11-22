import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class BusinessInfo extends Model {
  static table = 'business_info';

  @field('schema_name')    schemaName;
  @field('name')           name;
  @field('logo')           logo;
  @field('logo_local_uri') logoLocalUri;
  @field('logo_pending')   logoPending;
  @field('updated_at')     updatedAt;
}
