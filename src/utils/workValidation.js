/**
 * Work Validation Schema
 * 
 * จัดการการตรวจสอบข้อมูล input สำหรับ workload
 * ใช้เพื่อ validate ข้อมูลก่อนส่งเข้า database
 */

/**
 * Custom error class สำหรับ validation errors
 * ใช้สำหรับแยกประเภทข้อผิดพลาด
 */
export class WorkValidationError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', statusCode = 400) {
        super(message);
        this.name = 'WorkValidationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * ตรวจสอบข้อมูลการสร้าง workload
 * 
 * Rules:
 * - work_title: required, string, ไม่เกิน 255 ตัวอักษร
 * - description: optional, string, ไม่เกิน 5000 ตัวอักษร
 * - start_date: required, date, format YYYY-MM-DD
 * - end_date: required, date, format YYYY-MM-DD, >= start_date
 * - hours_per_week: required, integer, > 0, <= 168
 */
export function validateCreateWorkInput(data) {
    const errors = [];

    // 1. ตรวจสอบ work_title
    if (!data.work_title) {
        errors.push({
            field: 'work_title',
            message: 'ชื่อภาระงานจำเป็นต้องระบุ (work_title is required)',
            code: 'WORK_TITLE_REQUIRED',
        });
    } else if (typeof data.work_title !== 'string') {
        errors.push({
            field: 'work_title',
            message: 'ชื่อภาระงานต้องเป็นข้อความ (work_title must be string)',
            code: 'WORK_TITLE_INVALID_TYPE',
        });
    } else if (data.work_title.trim().length === 0) {
        errors.push({
            field: 'work_title',
            message: 'ชื่อภาระงานไม่สามารถว่างเปล่า (work_title cannot be empty)',
            code: 'WORK_TITLE_EMPTY',
        });
    } else if (data.work_title.length > 255) {
        errors.push({
            field: 'work_title',
            message: 'ชื่อภาระงานต้องไม่เกิน 255 ตัวอักษร (max 255 characters)',
            code: 'WORK_TITLE_TOO_LONG',
        });
    }

    // 2. ตรวจสอบ description (optional)
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push({
                field: 'description',
                message: 'รายละเอียดต้องเป็นข้อความ (description must be string)',
                code: 'DESCRIPTION_INVALID_TYPE',
            });
        } else if (data.description.length > 5000) {
            errors.push({
                field: 'description',
                message: 'รายละเอียดต้องไม่เกิน 5000 ตัวอักษร (max 5000 characters)',
                code: 'DESCRIPTION_TOO_LONG',
            });
        }
    }

    // 3. ตรวจสอบ start_date
    if (!data.start_date) {
        errors.push({
            field: 'start_date',
            message: 'วันเริ่มต้นจำเป็นต้องระบุ (start_date is required)',
            code: 'START_DATE_REQUIRED',
        });
    } else if (!isValidDate(data.start_date)) {
        errors.push({
            field: 'start_date',
            message: 'วันเริ่มต้องเป็นวันที่ที่ถูกต้อง YYYY-MM-DD (invalid date format)',
            code: 'START_DATE_INVALID_FORMAT',
        });
    }

    // 4. ตรวจสอบ end_date
    if (!data.end_date) {
        errors.push({
            field: 'end_date',
            message: 'วันสิ้นสุดจำเป็นต้องระบุ (end_date is required)',
            code: 'END_DATE_REQUIRED',
        });
    } else if (!isValidDate(data.end_date)) {
        errors.push({
            field: 'end_date',
            message: 'วันสิ้นสุดต้องเป็นวันที่ที่ถูกต้อง YYYY-MM-DD (invalid date format)',
            code: 'END_DATE_INVALID_FORMAT',
        });
    } else if (data.start_date && isValidDate(data.start_date)) {
        // ตรวจสอบ end_date >= start_date
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        
        if (endDate < startDate) {
            errors.push({
                field: 'end_date',
                message: 'วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น (end_date must be >= start_date)',
                code: 'END_DATE_BEFORE_START_DATE',
            });
        }
    }

    // 5. ตรวจสอบ hours_per_week
    if (data.hours_per_week === undefined || data.hours_per_week === null) {
        errors.push({
            field: 'hours_per_week',
            message: 'ชั่วโมงต่อสัปดาห์จำเป็นต้องระบุ (hours_per_week is required)',
            code: 'HOURS_PER_WEEK_REQUIRED',
        });
    } else {
        const hoursNum = Number(data.hours_per_week);
        
        if (isNaN(hoursNum)) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องเป็นตัวเลข (hours_per_week must be a number)',
                code: 'HOURS_PER_WEEK_INVALID_TYPE',
            });
        } else if (!Number.isInteger(hoursNum)) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องเป็นจำนวนเต็ม (hours_per_week must be integer)',
                code: 'HOURS_PER_WEEK_NOT_INTEGER',
            });
        } else if (hoursNum <= 0) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องมากกว่า 0 (hours_per_week must be > 0)',
                code: 'HOURS_PER_WEEK_NOT_POSITIVE',
            });
        } else if (hoursNum > 168) {
            // 168 ชั่วโมง = 7 วัน * 24 ชั่วโมง
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องไม่เกิน 168 ชั่วโมง (max 168 hours)',
                code: 'HOURS_PER_WEEK_TOO_HIGH',
            });
        }
    }

    // ถ้ามีข้อผิดพลาด ให้ throw
    if (errors.length > 0) {
        const error = new WorkValidationError(
            'Validation failed: ' + errors.map(e => e.message).join(', '),
            'VALIDATION_ERROR',
            400
        );
        error.details = errors;
        throw error;
    }

    return true;
}

/**
 * ตรวจสอบรูปแบบวันที่ YYYY-MM-DD
 * @param {string} dateString - วันที่ที่ต้องตรวจสอบ
 * @returns {boolean} true ถ้าเป็นวันที่ที่ถูกต้อง
 */
function isValidDate(dateString) {
    // ตรวจสอบรูปแบบ YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return false;
    }

    // ตรวจสอบว่าเป็นวันที่ที่ถูกต้อง
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
}

/**
 * ตรวจสอบรูปแบบการอัพเดท workload (คล้ายกับ create แต่ fields ไม่จำเป็น)
 * ใช้สำหรับ UPDATE endpoint (จะเพิ่มในอนาคต)
 */
export function validateUpdateWorkInput(data) {
    const errors = [];

    // work_title (optional)
    if (data.work_title !== undefined) {
        if (typeof data.work_title !== 'string') {
            errors.push({
                field: 'work_title',
                message: 'ชื่อภาระงานต้องเป็นข้อความ',
                code: 'WORK_TITLE_INVALID_TYPE',
            });
        } else if (data.work_title.trim().length === 0) {
            errors.push({
                field: 'work_title',
                message: 'ชื่อภาระงานไม่สามารถว่างเปล่า',
                code: 'WORK_TITLE_EMPTY',
            });
        } else if (data.work_title.length > 255) {
            errors.push({
                field: 'work_title',
                message: 'ชื่อภาระงานต้องไม่เกิน 255 ตัวอักษร',
                code: 'WORK_TITLE_TOO_LONG',
            });
        }
    }

    // description (optional)
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push({
                field: 'description',
                message: 'รายละเอียดต้องเป็นข้อความ',
                code: 'DESCRIPTION_INVALID_TYPE',
            });
        } else if (data.description.length > 5000) {
            errors.push({
                field: 'description',
                message: 'รายละเอียดต้องไม่เกิน 5000 ตัวอักษร',
                code: 'DESCRIPTION_TOO_LONG',
            });
        }
    }

    // start_date (optional)
    if (data.start_date !== undefined && !isValidDate(data.start_date)) {
        errors.push({
            field: 'start_date',
            message: 'วันเริ่มต้องเป็นวันที่ที่ถูกต้อง YYYY-MM-DD',
            code: 'START_DATE_INVALID_FORMAT',
        });
    }

    // end_date (optional)
    if (data.end_date !== undefined && !isValidDate(data.end_date)) {
        errors.push({
            field: 'end_date',
            message: 'วันสิ้นสุดต้องเป็นวันที่ที่ถูกต้อง YYYY-MM-DD',
            code: 'END_DATE_INVALID_FORMAT',
        });
    }

    // ตรวจสอบ end_date >= start_date
    if (data.start_date && data.end_date && isValidDate(data.start_date) && isValidDate(data.end_date)) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        
        if (endDate < startDate) {
            errors.push({
                field: 'end_date',
                message: 'วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น',
                code: 'END_DATE_BEFORE_START_DATE',
            });
        }
    }

    // hours_per_week (optional)
    if (data.hours_per_week !== undefined) {
        const hoursNum = Number(data.hours_per_week);
        
        if (isNaN(hoursNum)) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องเป็นตัวเลข',
                code: 'HOURS_PER_WEEK_INVALID_TYPE',
            });
        } else if (!Number.isInteger(hoursNum)) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องเป็นจำนวนเต็ม',
                code: 'HOURS_PER_WEEK_NOT_INTEGER',
            });
        } else if (hoursNum <= 0) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องมากกว่า 0',
                code: 'HOURS_PER_WEEK_NOT_POSITIVE',
            });
        } else if (hoursNum > 168) {
            errors.push({
                field: 'hours_per_week',
                message: 'ชั่วโมงต่อสัปดาห์ต้องไม่เกิน 168 ชั่วโมง',
                code: 'HOURS_PER_WEEK_TOO_HIGH',
            });
        }
    }

    if (errors.length > 0) {
        const error = new WorkValidationError(
            'Validation failed',
            'VALIDATION_ERROR',
            400
        );
        error.details = errors;
        throw error;
    }

    return true;
}
