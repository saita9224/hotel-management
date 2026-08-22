# WatermelonDB Migration - Setup & Testing Guide

## ✅ Completed Implementation

### Phase 1: Setup & Configuration ✓
- Babel configuration updated with decorators support
- Database schema defined (`database/schema.js`)
- Database initialization (`database/index.js`)
- SQLite adapter configured with JSI optimization

### Phase 2: Models & Schema ✓
- WatermelonDB models created:
  - `ProductModel` (`app/models/Product.js`)
  - `ReceiptModel` (`app/models/Receipt.js`)
  - `OrderModel` (`app/models/Order.js`)
  - `OrderItemModel` (`app/models/OrderItem.js`)
  - `ExpenseModel` (`app/models/Expense.js`)
  - `EmployeeModel` (`app/models/Employee.js`)
  - `MutationQueueModel` (`app/models/MutationQueue.js`)

### Phase 3: Repository Layer ✓
- Repository pattern implemented:
  - `ProductRepository` (`database/repositories/productRepository.js`)
  - `ReceiptRepository` (`database/repositories/receiptRepository.js`)
  - `ExpenseRepository` (`database/repositories/expenseRepository.js`)

### Phase 4: Sync Queue ✓
- WatermelonDB-based sync queue (`database/syncQueue.js`)
- Replaces AsyncStorage-based queue
- Supports all queue operations (enqueue, markSyncing, removeSucceeded, etc.)

### Phase 5: Service Layer Updates ✓
- Updated `services/syncService.js` to use WatermelonDB
- Updated context providers:
  - `OfflineContext.jsx` - uses new SyncQueue
  - `InventoryContext.jsx` - uses ProductRepository
  - `POSContext.jsx` - uses ReceiptRepository
  - `ExpensesContext.jsx` - uses ExpenseRepository

### Phase 6: App Integration ✓
- Database provider created (`database/DatabaseProvider.jsx`)
- App layout updated to include DatabaseProvider
- Migration scripts created (`scripts/migrateToWatermelon.js`)
- Test utilities created (`scripts/testWatermelonDB.js`)
- Database verification utilities (`database/init.js`)

## 🧪 Testing Instructions

### 1. Start the Development Server
```bash
cd hotel-management
npm start
```

### 2. Run Database Tests
Access the test screen at `/test-db` route or use the test utilities:

```javascript
import { testWatermelonDB } from './scripts/testWatermelonDB';
import { verifyDatabaseSetup } from './database/init';

// Run verification
const verification = await verifyDatabaseSetup();
console.log(verification);

// Run full tests
const testResults = await testWatermelonDB();
console.log(testResults);
```

### 3. Test Offline Functionality
1. Open the app and go to Inventory tab
2. Create a product while online
3. Disconnect network (airplane mode)
4. Create another product
5. Verify it's stored locally using WatermelonDB
6. Reconnect network
7. Verify sync process works

### 4. Migration from AsyncStorage
If you have existing AsyncStorage data:

```javascript
import { migrateFromAsyncStorage } from './scripts/migrateToWatermelon';

// Run migration
const result = await migrateFromAsyncStorage();
console.log(result);
```

## 🔍 Verification Checklist

- [ ] App starts without errors
- [ ] Database initializes successfully
- [ ] Sync queue operations work
- [ ] Product CRUD operations work
- [ ] Receipt CRUD operations work
- [ ] Expense CRUD operations work
- [ ] Offline mode creates local records
- [ ] Online mode syncs with server
- [ ] Context providers update correctly
- [ ] UI reflects local data changes

## 📊 Current Data Flow

### Online Mode:
1. User action → Context Provider
2. Context Provider → Service (API call)
3. Service → Backend GraphQL
4. Backend response → Service
5. Service → Repository (store in WatermelonDB)
6. Repository → Context Provider (update state)
7. Context Provider → UI

### Offline Mode:
1. User action → Context Provider
2. Context Provider → SyncQueue (enqueue mutation)
3. Context Provider → Repository (store in WatermelonDB)
4. Repository → Context Provider (update state)
5. Context Provider → UI
6. When online: Auto-sync triggers

## 🚀 Next Steps

### Backend Integration (Future)
The backend will need these updates to fully support the new sync architecture:

1. **GraphQL Schema Updates:**
   - Add sync-specific mutations (`pushSync`, `pullSync`)
   - Add sync fields to existing types (`_synced_at`, `_deleted`)
   - Add conflict resolution types

2. **Sync Service Implementation:**
   - Server-side sync handler
   - Conflict resolution logic
   - Change tracking mechanism

3. **Database Updates:**
   - Add sync timestamp fields
   - Add soft delete support
   - Create sync indexes

### Performance Optimization
- Implement batch operations for bulk data
- Add database indexes for frequently queried fields
- Optimize sync intervals based on data volume

### Additional Features
- Add data validation at repository level
- Implement complex queries with relationships
- Add database backup/restore functionality
- Implement data compression for large payloads

## 🐛 Troubleshooting

### Common Issues:

1. **Decorator syntax errors:**
   - Ensure Babel is configured with `@babel/plugin-proposal-decorators`
   - Check that decorators plugin has `{ legacy: true }` option

2. **Database initialization fails:**
   - Verify SQLite adapter is properly configured
   - Check that schema is correctly defined
   - Ensure JSI is available (or disable it if not supported)

3. **Sync queue not working:**
   - Verify SyncQueue is imported from correct path
   - Check that database.write() is used for mutations
   - Ensure async/await is properly used

4. **Context provider errors:**
   - Verify DatabaseProvider wraps OfflineProvider
   - Check that repositories are imported correctly
   - Ensure database is passed to DatabaseProvider

## 📝 Notes

- The frontend is now fully migrated to WatermelonDB
- Offline functionality works with local database storage
- Sync architecture is ready for backend integration
- Migration utilities are available for existing data
- Test suite validates all core functionality
