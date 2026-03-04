/**
 * Migration Script: Drop unique indexes on 'ma' column for master-data collections
 *
 * In a multi-tenant system, the unique index on 'ma' is global (not per-tenant),
 * which prevents different tenants from having the same 'ma' value.
 * This script removes those unique indexes so tenantId-based filtering handles uniqueness instead.
 *
 * Usage:
 *   env-cmd -e db node scripts/drop-unique-indexes-on-ma.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without modifying the database
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('❌ Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db node scripts/drop-unique-indexes-on-ma.js');
  process.exit(1);
}

// Collections that had unique index on 'ma'
const MA_COLLECTIONS = [
  'bo_phan',
  'chu_dau_tu',
  'doi_tuong',
  'dong_tien',
  'du_an',
  'khoan_muc',
  'loai_chung_tu',
  'loai_giao_dich',
  'ngan_hang',
  'nhom_khoan_muc',
  'nhom_khuyen_mai',
  'nhom_quan_ly',
  'san_pham',
  'tai_khoan',
];

// hop_dong uses 'soHopDong' instead of 'ma'
const SO_HOP_DONG_COLLECTIONS = [
  { collection: 'hop_dong', field: 'soHopDong' },
];

async function dropUniqueIndexes() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB: ${MONGODB_DATABASE}\n`);

    const db = client.db(MONGODB_DATABASE);

    let dropped = 0;
    let skipped = 0;
    let errors = 0;

    // Process 'ma' field collections
    for (const colName of MA_COLLECTIONS) {
      await processCollection(db, colName, 'ma', isDryRun, { dropped: () => dropped++, skipped: () => skipped++, error: () => errors++ });
    }

    // Process 'soHopDong' field collections
    for (const { collection, field } of SO_HOP_DONG_COLLECTIONS) {
      await processCollection(db, collection, field, isDryRun, { dropped: () => dropped++, skipped: () => skipped++, error: () => errors++ });
    }

    console.log('\n==================================================');
    console.log('📊 SUMMARY');
    console.log('==================================================');
    console.log(`✅ Dropped: ${dropped}`);
    console.log(`⏭️  Skipped (no unique index): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total collections checked: ${MA_COLLECTIONS.length + SO_HOP_DONG_COLLECTIONS.length}`);
    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.');
    }
    console.log('==================================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

async function processCollection(db, colName, field, isDryRun, counters) {
  try {
    const collection = db.collection(colName);
    const indexes = await collection.indexes();

    // Find unique index on the target field
    const uniqueIndex = indexes.find(
      (idx) => idx.unique && idx.key && idx.key[field] !== undefined && idx.name !== '_id_'
    );

    if (!uniqueIndex) {
      console.log(`⏭️  ${colName}: No unique index on '${field}' — skipping`);
      counters.skipped();
      return;
    }

    if (isDryRun) {
      console.log(`🔍 ${colName}: Would drop index '${uniqueIndex.name}' (unique on '${field}')`);
      counters.dropped();
      return;
    }

    await collection.dropIndex(uniqueIndex.name);
    console.log(`✅ ${colName}: Dropped index '${uniqueIndex.name}' (unique on '${field}')`);
    counters.dropped();
  } catch (error) {
    console.error(`❌ ${colName}: Error — ${error.message}`);
    counters.error();
  }
}

dropUniqueIndexes();
