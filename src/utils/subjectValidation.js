/**
 * Subject Validation Utilities
 * รับผิดชอบการ validate ข้อมูล subject ทั้งหมด
 * ไม่มี database logic, ไม่มี business logic
 */

/**
 * Validation Error สำหรับแสดง error ที่เกิดจากการ validate
 */
export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.statusCode = 400;
    }
}

/**
 * ตรวจสอบว่า value เป็น array ของ integers ที่ valid หรือไม่
 * @param {any} value - ค่าที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
function isArrayOfIntegers(value) {
    return Array.isArray(value) && value.every(item => Number.isInteger(item));
}

/**
 * ตรวจสอบว่ามี duplicate values ใน array หรือไม่
 * @param {Array} arr - Array ที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
}

/**
 * Validate student_year_ids
 * @param {any} studentYearIds - ค่าที่ส่งมาจาก request
 * @throws {ValidationError} ถ้าข้อมูลไม่ valid
 */
export function validateStudentYearIds(studentYearIds) {
    // ตรวจสอบว่ามีค่า
    if (!studentYearIds) {
        throw new ValidationError(
            'student_year_ids เป็น required field',
            'student_year_ids'
        );
    }

    // ตรวจสอบว่าเป็น array
    if (!Array.isArray(studentYearIds)) {
        throw new ValidationError(
            'student_year_ids ต้องเป็น array',
            'student_year_ids'
        );
    }

    // ตรวจสอบว่าไม่ว่างเปล่า
    if (studentYearIds.length === 0) {
        throw new ValidationError(
            'student_year_ids ต้องมีอย่างน้อย 1 ค่า',
            'student_year_ids'
        );
    }

    // ตรวจสอบว่าทุกค่าเป็น integer
    if (!isArrayOfIntegers(studentYearIds)) {
        throw new ValidationError(
            'student_year_ids ทุกค่าต้องเป็นตัวเลขจำนวนเต็ม',
            'student_year_ids'
        );
    }

    // ตรวจสอบว่าทุกค่าเป็น positive integer
    const hasNonPositive = studentYearIds.some(id => id <= 0);
    if (hasNonPositive) {
        throw new ValidationError(
            'student_year_ids ทุกค่าต้องมากกว่า 0',
            'student_year_ids'
        );
    }

    // ตรวจสอบว่าไม่มีค่าซ้ำ
    if (hasDuplicates(studentYearIds)) {
        throw new ValidationError(
            'student_year_ids ต้องไม่มีค่าซ้ำกัน',
            'student_year_ids'
        );
    }
}

/**
 * Validate ข้อมูล subject สำหรับการสร้างใหม่
 * @param {Object} data - ข้อมูล subject จาก request
 * @throws {ValidationError} ถ้าข้อมูลไม่ valid
 */
export function validateCreateSubjectData(data) {
    const errors = [];

    // Required fields
    if (!data.code_th || typeof data.code_th !== 'string' || data.code_th.trim() === '') {
        errors.push({ field: 'code_th', message: 'code_th เป็น required และต้องเป็น string' });
    }

    if (!data.name_th || typeof data.name_th !== 'string' || data.name_th.trim() === '') {
        errors.push({ field: 'name_th', message: 'name_th เป็น required และต้องเป็น string' });
    }

    if (!data.program_id || !Number.isInteger(data.program_id) || data.program_id <= 0) {
        errors.push({ field: 'program_id', message: 'program_id เป็น required และต้องเป็น positive integer' });
    }

    if (data.credit === undefined || data.credit === null || !Number.isInteger(data.credit) || data.credit < 0) {
        errors.push({ field: 'credit', message: 'credit เป็น required และต้องเป็น non-negative integer' });
    }

    // Optional fields (ถ้ามี ต้อง valid)
    if (data.code_eng !== undefined && data.code_eng !== null && typeof data.code_eng !== 'string') {
        errors.push({ field: 'code_eng', message: 'code_eng ต้องเป็น string' });
    }

    if (data.name_eng !== undefined && data.name_eng !== null && typeof data.name_eng !== 'string') {
        errors.push({ field: 'name_eng', message: 'name_eng ต้องเป็น string' });
    }

    if (data.outline !== undefined && data.outline !== null && typeof data.outline !== 'string') {
        errors.push({ field: 'outline', message: 'outline ต้องเป็น string' });
    }

    if (data.count_workload !== undefined && typeof data.count_workload !== 'boolean') {
        errors.push({ field: 'count_workload', message: 'count_workload ต้องเป็น boolean' });
    }

    if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
        errors.push({ field: 'is_active', message: 'is_active ต้องเป็น boolean' });
    }

    // Validate student_year_ids
    try {
        validateStudentYearIds(data.student_year_ids);
    } catch (err) {
        if (err instanceof ValidationError) {
            errors.push({ field: err.field, message: err.message });
        }
    }

    // ถ้ามี errors ให้ throw
    if (errors.length > 0) {
        const error = new ValidationError('ข้อมูลไม่ถูกต้อง');
        error.errors = errors;
        throw error;
    }
}

/**
 * Validate ข้อมูล subject สำหรับการอัปเดต
 * @param {Object} data - ข้อมูล subject จาก request
 * @throws {ValidationError} ถ้าข้อมูลไม่ valid
 */
export function validateUpdateSubjectData(data) {
    const errors = [];

    // ตรวจสอบว่ามีข้อมูลที่จะ update หรือไม่
    if (!data || Object.keys(data).length === 0) {
        throw new ValidationError('ต้องมีข้อมูลอย่างน้อย 1 field ที่จะอัปเดต');
    }

    // Validate แต่ละ field (ถ้ามี)
    if (data.code_th !== undefined) {
        if (typeof data.code_th !== 'string' || data.code_th.trim() === '') {
            errors.push({ field: 'code_th', message: 'code_th ต้องเป็น string และไม่ว่างเปล่า' });
        }
    }

    if (data.name_th !== undefined) {
        if (typeof data.name_th !== 'string' || data.name_th.trim() === '') {
            errors.push({ field: 'name_th', message: 'name_th ต้องเป็น string และไม่ว่างเปล่า' });
        }
    }

    if (data.program_id !== undefined) {
        if (!Number.isInteger(data.program_id) || data.program_id <= 0) {
            errors.push({ field: 'program_id', message: 'program_id ต้องเป็น positive integer' });
        }
    }

    if (data.credit !== undefined) {
        if (!Number.isInteger(data.credit) || data.credit < 0) {
            errors.push({ field: 'credit', message: 'credit ต้องเป็น non-negative integer' });
        }
    }

    if (data.code_eng !== undefined && data.code_eng !== null && typeof data.code_eng !== 'string') {
        errors.push({ field: 'code_eng', message: 'code_eng ต้องเป็น string' });
    }

    if (data.name_eng !== undefined && data.name_eng !== null && typeof data.name_eng !== 'string') {
        errors.push({ field: 'name_eng', message: 'name_eng ต้องเป็น string' });
    }

    if (data.outline !== undefined && data.outline !== null && typeof data.outline !== 'string') {
        errors.push({ field: 'outline', message: 'outline ต้องเป็น string' });
    }

    if (data.count_workload !== undefined && typeof data.count_workload !== 'boolean') {
        errors.push({ field: 'count_workload', message: 'count_workload ต้องเป็น boolean' });
    }

    if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
        errors.push({ field: 'is_active', message: 'is_active ต้องเป็น boolean' });
    }

    // Validate student_year_ids (ถ้ามี)
    if (data.student_year_ids !== undefined) {
        try {
            validateStudentYearIds(data.student_year_ids);
        } catch (err) {
            if (err instanceof ValidationError) {
                errors.push({ field: err.field, message: err.message });
            }
        }
    }

    // ถ้ามี errors ให้ throw
    if (errors.length > 0) {
        const error = new ValidationError('ข้อมูลไม่ถูกต้อง');
        error.errors = errors;
        throw error;
    }
}

/**
 * Normalize ข้อมูล subject ก่อนนำไป save
 * (trim strings, set defaults, etc.)
 * @param {Object} data - ข้อมูล subject
 * @returns {Object} ข้อมูลที่ normalized แล้ว
 */
export function normalizeSubjectData(data) {
    const normalized = { ...data };

    // Trim strings
    if (normalized.code_th) {
        normalized.code_th = normalized.code_th.trim();
    }

    if (normalized.code_eng) {
        normalized.code_eng = normalized.code_eng.trim();
    }

    if (normalized.name_th) {
        normalized.name_th = normalized.name_th.trim();
    }

    if (normalized.name_eng) {
        normalized.name_eng = normalized.name_eng.trim();
    }

    if (normalized.outline) {
        normalized.outline = normalized.outline.trim();
    }

    // Set defaults
    if (normalized.count_workload === undefined) {
        normalized.count_workload = true;
    }

    if (normalized.is_active === undefined) {
        normalized.is_active = true;
    }

    // แปลง student_year_ids ให้เป็น array of numbers (ป้องกัน string)
    if (normalized.student_year_ids) {
        normalized.student_year_ids = normalized.student_year_ids.map(id => Number(id));
    }

    return normalized;
}
