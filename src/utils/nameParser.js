/**
 * Name Parser Utility
 * ฟังก์ชันสำหรับแยกชื่อ-นามสกุล จากชื่อเต็ม
 * 
 * Pure functions - ไม่มี side effects
 */

/**
 * แยกชื่อภาษาไทยเป็น ชื่อ และ นามสกุล
 * รูปแบบ: "ชื่อ นามสกุล"
 * 
 * @param {string} fullNameTh - ชื่อเต็มภาษาไทย
 * @returns {Object} { firstName: string, lastName: string }
 */
export function parseThaiName(fullNameTh) {
    if (!fullNameTh || typeof fullNameTh !== 'string') {
        return { firstName: '', lastName: '' };
    }

    const trimmed = fullNameTh.trim();
    const parts = trimmed.split(/\s+/); // แยกด้วย whitespace

    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    // ส่วนแรกคือชื่อ ส่วนที่เหลือคือนามสกุล
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    return { firstName, lastName };
}

/**
 * แยกชื่อภาษาอังกฤษเป็น ชื่อ และ นามสกุล
 * รูปแบบ: "FirstName LastName"
 * 
 * @param {string} fullNameEn - ชื่อเต็มภาษาอังกฤษ
 * @returns {Object} { firstName: string, lastName: string }
 */
export function parseEnglishName(fullNameEn) {
    if (!fullNameEn || typeof fullNameEn !== 'string') {
        return { firstName: '', lastName: '' };
    }

    const trimmed = fullNameEn.trim();
    const parts = trimmed.split(/\s+/); // แยกด้วย whitespace

    if (parts.length === 0) {
        return { firstName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    // ส่วนแรกคือชื่อ ส่วนที่เหลือคือนามสกุล
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    return { firstName, lastName };
}
