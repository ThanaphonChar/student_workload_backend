/**
 * Migration: สร้างตาราง work_details
 * 
 * ตาราง work_details เก็บรายละเอียดภาระงาน (ทำงาน) ของแต่ละ term_subject
 * 
 * โครงสร้าง:
 * - เชื่อมโยงกับ term_subjects โดย term_subject_id
 * - ติดตามการเปลี่ยนแปลง โดย created_by, updated_by, created_at, updated_at
 * - เก็บข้อมูลเกี่ยวกับภาระงาน: ชื่อ, รายละเอียด, วันเริ่ม, วันสิ้นสุด, ชั่วโมงต่อสัปดาห์
 */

-- สร้างตาราง work_details ถ้ายังไม่มี
CREATE TABLE IF NOT EXISTS work_details (
    id SERIAL PRIMARY KEY,
    
    -- อ้างอิงถึง term_subjects
    term_subject_id INTEGER NOT NULL UNIQUE,
    CONSTRAINT fk_work_details_term_subject 
        FOREIGN KEY (term_subject_id) 
        REFERENCES term_subjects(id) 
        ON DELETE CASCADE,
    
    -- ข้อมูลภาระงาน
    work_title VARCHAR(255) NOT NULL,                      -- ชื่อภาระงาน
    description TEXT,                                      -- รายละเอียด (optional)
    start_date DATE NOT NULL,                              -- วันเริ่มต้น
    end_date DATE NOT NULL,                                -- วันสิ้นสุด
    hours_per_week INTEGER NOT NULL CHECK (hours_per_week > 0),  -- ชั่วโมงต่อสัปดาห์
    
    -- ติดตามการเปลี่ยนแปลง
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    CONSTRAINT fk_work_details_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id),
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    CONSTRAINT fk_work_details_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(id)
);

-- เพิ่ม comments เพื่อความชัดเจน
COMMENT ON TABLE work_details IS 
'ตาราง work_details เก็บรายละเอียดภาระงานของแต่ละ term_subject ซึ่ง academic officer สร้าง';

COMMENT ON COLUMN work_details.term_subject_id IS 
'ID ของ term_subject ที่สอดคล้อง (unique - แต่ละ term_subject มีภาระงานเพียง 1 รายการ)';

COMMENT ON COLUMN work_details.work_title IS 
'ชื่อภาระงาน (required)';

COMMENT ON COLUMN work_details.description IS 
'รายละเอียดเพิ่มเติมของภาระงาน (optional)';

COMMENT ON COLUMN work_details.start_date IS 
'วันเริ่มต้นของภาระงาน (required)';

COMMENT ON COLUMN work_details.end_date IS 
'วันสิ้นสุดของภาระงาน (required, ต้อง >= start_date)';

COMMENT ON COLUMN work_details.hours_per_week IS 
'ชั่วโมงที่ต้องใช้ต่อสัปดาห์ (required, > 0)';

COMMENT ON COLUMN work_details.created_by IS 
'ID ของผู้สร้างรายการ (academic officer)';

COMMENT ON COLUMN work_details.updated_by IS 
'ID ของผู้แก้ไขรายการล่าสุด (optional, ถ้าเคยแก้ไข)';

-- สร้าง indices เพื่อประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_work_details_term_subject_id 
ON work_details(term_subject_id);

CREATE INDEX IF NOT EXISTS idx_work_details_created_by 
ON work_details(created_by);

CREATE INDEX IF NOT EXISTS idx_work_details_start_date 
ON work_details(start_date);

CREATE INDEX IF NOT EXISTS idx_work_details_end_date 
ON work_details(end_date);
