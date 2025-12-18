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

    const normalized = facultyNameTh.trim();
    return normalized === ALLOWED_FACULTY;
}

/**
 * ดึงชื่อคณะที่อนุญาตให้เข้าใช้งาน
 * 
 * @returns {string} - ชื่อคณะที่อนุญาต
 */
export function getAllowedFacultyName() {
    return ALLOWED_FACULTY;
}
