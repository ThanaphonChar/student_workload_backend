/**
 * Upload Middleware
 * 
 * จัดการ file upload ด้วย multer
 * ใช้ memoryStorage เพื่อให้ได้ document_type ก่อนเขียนไฟล์
 * ไฟล์จะถูกเก็บที่ /uploads/term-subjects/{term_subject_id}/{document_type}/
 * 
 * หน้าที่:
 * - รับไฟล์เข้า memory ก่อน
 * - Controller จะเขียนไฟล์จริงหลังจากรู้ document_type แล้ว
 * - จำกัดประเภทและขนาดไฟล์
 */

import multer from 'multer';

// ใช้ memory storage เพื่อให้ได้ document_type ก่อน
const storage = multer.memoryStorage();

// กำหนด file filter (ควบคุมประเภทไฟล์ที่อนุญาต)
const fileFilter = (req, file, cb) => {
    // อนุญาตเฉพาะไฟล์ document types
    const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, Excel, and images are allowed.'), false);
    }
};

// สร้าง multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // จำกัดขนาด 50 MB
    }
});

// Export middleware สำหรับ single file upload
export const uploadSingleFile = upload.single('file');
