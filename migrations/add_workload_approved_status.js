/**
 * Migration: Add workload_approved status field
 * 
 * Adds a new field to track workload submission and approval status
 * with three states: pending (ยังไม่ส่ง), submitted (รออนุมัติ), approved (อนุมัติแล้ว)
 * 
 * Run: node scripts/runMigration.js migrations/add_workload_approved_status.js
 */

export async function up(client) {
    console.log('⬆️  Running migration: add_workload_approved_status');

    // Add workload_approved column if it doesn't exist
    await client.query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'term_subjects' 
                AND column_name = 'workload_approved'
            ) THEN
                ALTER TABLE term_subjects 
                ADD COLUMN workload_approved VARCHAR(20) DEFAULT 'pending' CHECK (
                    workload_approved IN ('pending', 'submitted', 'approved')
                );
                
                COMMENT ON COLUMN term_subjects.workload_approved IS 
                'Workload submission status: pending (ยังไม่ส่ง), submitted (รออนุมัติ), approved (อนุมัติแล้ว)';
            END IF;
        END $$;
    `);

    console.log('✅ Added workload_approved column with enum constraint');

    // Create index for faster queries filtering by workload_approved
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_term_subjects_workload_approved 
        ON term_subjects(workload_approved);
    `);

    console.log('✅ Created index on workload_approved column');
}

export async function down(client) {
    console.log('⬇️  Rolling back migration: add_workload_approved_status');

    // Drop index
    await client.query(`
        DROP INDEX IF EXISTS idx_term_subjects_workload_approved;
    `);

    console.log('✅ Dropped index on workload_approved column');

    // Drop column
    await client.query(`
        ALTER TABLE term_subjects 
        DROP COLUMN IF EXISTS workload_approved;
    `);

    console.log('✅ Dropped workload_approved column');
}
