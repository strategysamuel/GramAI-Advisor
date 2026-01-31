// Database migration system
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { db } from './connection';

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = join(__dirname, 'migrations');
  }

  // Create migrations table if it doesn't exist
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.query(sql);
  }

  // Get list of executed migrations
  private async getExecutedMigrations(): Promise<string[]> {
    const result = await db.query('SELECT id FROM migrations ORDER BY id');
    return result.rows.map((row: any) => row.id);
  }

  // Get list of available migration files
  private getMigrationFiles(): Migration[] {
    const files = readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const id = filename.replace('.sql', '');
      const sql = readFileSync(join(this.migrationsPath, filename), 'utf8');
      
      return { id, filename, sql };
    });
  }

  // Execute a single migration
  private async executeMigration(migration: Migration): Promise<void> {
    console.log(`Executing migration: ${migration.filename}`);
    
    await db.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(migration.sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
        [migration.id, migration.filename]
      );
    });
    
    console.log(`Migration completed: ${migration.filename}`);
  }

  // Run all pending migrations
  public async runMigrations(): Promise<void> {
    try {
      console.log('Starting database migrations...');
      
      // Ensure database connection
      await db.connect();
      
      // Create migrations table
      await this.createMigrationsTable();
      
      // Get executed and available migrations
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getMigrationFiles();
      
      // Find pending migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration.id)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found.');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations.`);
      
      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('All migrations completed successfully.');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Rollback last migration (for development)
  public async rollbackLastMigration(): Promise<void> {
    try {
      console.log('Rolling back last migration...');
      
      await db.connect();
      
      // Get last executed migration
      const result = await db.query(
        'SELECT id, filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }
      
      const lastMigration = result.rows[0];
      console.log(`Rolling back migration: ${lastMigration.filename}`);
      
      // Note: This is a simple implementation
      // In production, you'd want proper rollback scripts
      await db.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
      
      console.log('Rollback completed. Note: Schema changes were not reverted.');
      console.log('You may need to manually revert schema changes.');
      
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  // Get migration status
  public async getMigrationStatus(): Promise<void> {
    try {
      await db.connect();
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getMigrationFiles();
      
      console.log('\n=== Migration Status ===');
      console.log(`Total available migrations: ${availableMigrations.length}`);
      console.log(`Executed migrations: ${executedMigrations.length}`);
      
      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration.id)
      );
      console.log(`Pending migrations: ${pendingMigrations.length}`);
      
      if (pendingMigrations.length > 0) {
        console.log('\nPending migrations:');
        pendingMigrations.forEach(migration => {
          console.log(`  - ${migration.filename}`);
        });
      }
      
      console.log('\nExecuted migrations:');
      executedMigrations.forEach(id => {
        console.log(`  ✓ ${id}.sql`);
      });
      
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      runner.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'rollback':
      runner.rollbackLastMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'status':
      runner.getMigrationStatus()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('Usage: ts-node migrate.ts [up|rollback|status]');
      process.exit(1);
  }
}

export default MigrationRunner;