/**
 * Run database migration
 * Usage: tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running database migration...\n');

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/001_crypto_exchanges.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('COMMENT')) {
        console.log(`⏭️  Skipping comment statement ${i + 1}`);
        continue;
      }

      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

      // For table creation, we can use Supabase's RPC or direct query
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100));

        // Continue with other statements
        continue;
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`);
    }

    console.log('✨ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
