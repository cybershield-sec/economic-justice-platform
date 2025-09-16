const fs = require('fs');
const path = require('path');

function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.sql`;
  const filepath = path.join(__dirname, 'migrations', filename);

  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL migration here
-- Use separate statements for better error handling

BEGIN;

-- Example: CREATE TABLE example_table (...);

COMMIT;
`;

  fs.writeFileSync(filepath, template);
  console.log(`Created migration: ${filename}`);
  console.log(`Location: ${filepath}`);
}

// Get migration name from command line arguments
const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Usage: node create-migration.js <migration_name>');
  console.error('Example: node create-migration.js add_user_profile_fields');
  process.exit(1);
}

createMigration(migrationName);