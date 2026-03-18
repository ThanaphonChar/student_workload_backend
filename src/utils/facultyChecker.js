/**
 * Faculty Checker Utility
 * ตรวจสอบสิทธิ์การเข้าใช้งานตามคณะ
 */

// คณะที่อนุญาตให้เข้าใช้งานระบบ
const ALLOWED_FACULTY = 'คณะวิทยาศาสตร์และเทคโนโลยี';

/**
 * ตรวจสอบว่าคณะนี้ได้รับอนุญาตให้เข้าใช้งานหรือไม่
 * 
 * @param {string} facultyNameTh - ชื่อคณะภาษาไทย
 * @returns {boolean} - true หากอนุญาต, false หากไม่อนุญาต
 */
export function isAllowedFaculty(facultyNameTh) {
    if (!facultyNameTh || typeof facultyNameTh !== 'string') {
        return false;
    }

    // Normalize spaces เพื่อรองรับข้อมูลที่มีช่องว่าง/คำต่อท้ายแตกต่างกัน
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();

    const normalized = normalize(facultyNameTh);
    const allowedNormalized = normalize(ALLOWED_FACULTY);

    // ผ่านได้ทั้งกรณีเท่ากันพอดี และกรณีมีคำต่อท้าย เช่น "มหาวิทยาลัยธรรมศาสตร์"
    return normalized === allowedNormalized || normalized.includes(allowedNormalized);
}

/**
 * ดึงชื่อคณะที่อนุญาตให้เข้าใช้งาน
 * 
 * @returns {string} - ชื่อคณะที่อนุญาต
 */
export function getAllowedFacultyName() {
    return ALLOWED_FACULTY;
}
