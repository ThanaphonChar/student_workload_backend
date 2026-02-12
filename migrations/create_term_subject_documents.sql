/**
 * Migration: สร้างตาราง term_subject_documents
 * เก็บ metadata ของไฟล์ที่อัปโหลดโดย Professor
 */

-- สร้างตารางเก็บข้อมูลเอกสารที่อัปโหลด
CREATE TABLE IF NOT EXISTS term_subject_documents (
    id SERIAL PRIMARY KEY,
    term_subject_id INTEGER NOT NULL REFERENCES term_subjects(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,  -- 'outline', 'workload', 'report'
    file_path TEXT NOT NULL,             -- path ของไฟล์ที่เก็บบน server
    original_name VARCHAR(255) NOT NULL, -- ชื่อไฟล์ต้นฉบับ
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    
    -- สร้าง index สำหรับ query ที่ใช้บ่อย
    CONSTRAINT unique_term_subject_document UNIQUE (term_subject_id, document_type, uploaded_at)
);

-- สร้าง indexes
CREATE INDEX idx_term_subject_documents_term_subject 
    ON term_subject_documents(term_subject_id);
    
CREATE INDEX idx_term_subject_documents_type 
    ON term_subject_documents(term_subject_id, document_type);

-- Comment
COMMENT ON TABLE term_subject_documents IS 'เก็บข้อมูลไฟล์เอกสารที่อาจารย์อัปโหลดสำหรับแต่ละ term subject';
COMMENT ON COLUMN term_subject_documents.document_type IS 'ประเภทเอกสาร: outline (เค้าโครงรายวิชา), report (รายงานผล). หมายเหตุ: workload ไม่ใช่เอกสาร แต่เป็นข้อมูลที่กรอกในระบบ';
COMMENT ON COLUMN term_subject_documents.file_path IS 'relative path จาก project root เช่น uploads/term-subjects/123/outline-1707123456789.pdf';
