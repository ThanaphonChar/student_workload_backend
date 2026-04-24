-- Check subjects table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'subjects' 
ORDER BY ordinal_position;

-- Check a sample subject record
SELECT id, name_th, name_eng FROM subjects LIMIT 5;

-- Check if code columns exist
SELECT * FROM subjects LIMIT 1;
