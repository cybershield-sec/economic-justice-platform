const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldRollback = args.includes('--rollback');

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async init() {
    await this.createMigrationsTable();
  }

  async createMigrationsTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT name FROM migrations ORDER BY id');
      return result.rows.map(row => row.name);
    } finally {
      client.release();
    }
  }

  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.filter(file => !executed.includes(file));
  }

  async runMigration(filename) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const migrationPath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      console.log(`Running migration: ${filename}`);
      await client.query(sql);

      await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);

      await client.query('COMMIT');
      console.log(`✓ Migration completed: ${filename}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Migration failed: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runAllMigrations() {
    await this.init();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`);

    for (const migration of pending) {
      await this.runMigration(migration);
    }

    console.log('All migrations completed successfully');
  }

  async rollbackLastMigration() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        console.log('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0].name;
      console.log(`Rolling back: ${lastMigration}`);

      // Note: This would need specific rollback SQL for each migration
      // For now, we just remove the migration record
      await client.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);

      console.log(`✓ Rollback completed: ${lastMigration}`);

    } finally {
      client.release();
    }
  }
}

// Main execution
async function main() {
  const runner = new MigrationRunner();

  try {
    if (shouldRollback) {
      await runner.rollbackLastMigration();
    } else {
      await runner.runAllMigrations();
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await runner.pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;