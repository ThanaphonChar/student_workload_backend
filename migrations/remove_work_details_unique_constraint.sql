/**
 * Migration: ลบ UNIQUE constraint จาก term_subject_id ใน work_details
 * 
 * เหตุผล: ต้องการให้แต่ละ term_subject สามารถมีภาระงานได้หลายรายการ
 * (เช่น การบ้าน 1, การบ้าน 2, การสอบ, โปรเจค ฯลฯ)
 */

-- ลบ UNIQUE constraint จาก term_subject_id
ALTER TABLE work_details 
DROP CONSTRAINT IF EXISTS work_details_term_subject_id_key;

-- ถ้าเป็น UNIQUE INDEX ก็ต้องลบด้วย
DROP INDEX IF EXISTS work_details_term_subject_id_key;

-- อัพเดท comment
COMMENT ON COLUMN work_details.term_subject_id IS 
'ID ของ term_subject ที่สอดคล้อง (สามารถมีหลายภาระงานต่อ 1 term_subject)';

COMMENT ON TABLE work_details IS 
'ตาราง work_details เก็บรายละเอียดภาระงานของแต่ละ term_subject (สามารถมีหลายภาระงานต่อ 1 วิชา)';
