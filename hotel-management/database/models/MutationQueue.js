// database/models/MutationQueue.js
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class MutationQueueModel extends Model {
  static table = 'mutation_queue';

  @field('client_id') clientId;
  @field('mutation_type') mutationType;
  @field('payload') payload; // JSON string
  @field('status') status; // PENDING, SYNCING, FAILED
  @date('created_at') createdAt;
  @field('error') error;
}
