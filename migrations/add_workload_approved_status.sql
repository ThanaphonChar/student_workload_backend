-- Migration: Add workload_approved status field
-- Adds a new field to track workload submission and approval status

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
        
        RAISE NOTICE 'Added workload_approved column';
    ELSE
        RAISE NOTICE 'Column workload_approved already exists';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_term_subjects_workload_approved 
ON term_subjects(workload_approved);
