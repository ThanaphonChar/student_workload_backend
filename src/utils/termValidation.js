/**
 * Term Validation Utilities
 * Pure validation functions without side effects
 * Custom error classes for proper error handling
 */

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
    constructor(message, field = null, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.details = details;
        this.statusCode = 400;
    }
}

/**
 * Custom error class for business logic errors
 */
export class BusinessError extends Error {
    constructor(message, code = null, statusCode = 400) {
        super(message);
        this.name = 'BusinessError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * Validate academic year
 */
export function validateAcademicYear(year) {
    if (!year) {
        throw new ValidationError('Academic year is required', 'academic_year');
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
        throw new ValidationError('Academic year must be a number', 'academic_year');
    }

    if (yearNum < 2000 || yearNum > 3000) {
        throw new ValidationError('Academic year must be between 2000 and 3000', 'academic_year');
    }

    return yearNum;
}

/**
 * Validate academic sector
 */
export function validateAcademicSector(sector) {
    if (!sector) {
        throw new ValidationError('Academic sector is required', 'academic_sector');
    }

    const sectorNum = parseInt(sector);
    if (isNaN(sectorNum)) {
        throw new ValidationError('Academic sector must be a number', 'academic_sector');
    }

    if (![1, 2, 3].includes(sectorNum)) {
        throw new ValidationError('Academic sector must be 1, 2, or 3', 'academic_sector');
    }

    return sectorNum;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function validateDateFormat(dateString, fieldName) {
    if (!dateString) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        throw new ValidationError(
            `${fieldName} must be in YYYY-MM-DD format`,
            fieldName
        );
    }

    // Check if date is valid
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new ValidationError(`${fieldName} is not a valid date`, fieldName);
    }

    return dateString;
}

/**
 * Validate date range (end must be after start)
 */
export function validateDateRange(startDate, endDate, rangeLabel) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
        throw new ValidationError(
            `${rangeLabel}: End date must be after start date`,
            rangeLabel.toLowerCase().replace(' ', '_')
        );
    }
}

/**
 * Validate that date is within a range
 */
export function validateDateWithinRange(date, rangeStart, rangeEnd, label) {
    const dateObj = new Date(date);
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);

    if (dateObj < start || dateObj > end) {
        throw new ValidationError(
            `${label} must be within term dates (${rangeStart} to ${rangeEnd})`,
            label.toLowerCase().replace(' ', '_')
        );
    }
}

/**
 * Validate that two date ranges don't overlap
 */
export function validateNoDateOverlap(range1Start, range1End, range2Start, range2End, label1, label2) {
    const r1Start = new Date(range1Start);
    const r1End = new Date(range1End);
    const r2Start = new Date(range2Start);
    const r2End = new Date(range2End);

    // Check if ranges overlap
    if (r1Start <= r2End && r2Start <= r1End) {
        throw new ValidationError(
            `${label1} and ${label2} dates cannot overlap`,
            'exam_dates'
        );
    }
}

/**
 * Validate complete term data structure
 */
export function validateTermData(termData) {
    const errors = [];

    try {
        validateAcademicYear(termData.academic_year);
    } catch (err) {
        errors.push(err.message);
    }

    try {
        validateAcademicSector(termData.academic_sector);
    } catch (err) {
        errors.push(err.message);
    }

    // Validate all date fields
    const dateFields = [
        'term_start_date',
        'term_end_date',
        'midterm_start_date',
        'midterm_end_date',
        'final_start_date',
        'final_end_date',
    ];

    for (const field of dateFields) {
        try {
            validateDateFormat(termData[field], field);
        } catch (err) {
            errors.push(err.message);
        }
    }

    // If basic validation failed, return early
    if (errors.length > 0) {
        throw new ValidationError('Validation failed', null, errors);
    }

    // Validate date ranges
    try {
        validateDateRange(termData.term_start_date, termData.term_end_date, 'Term dates');
    } catch (err) {
        errors.push(err.message);
    }

    try {
        validateDateRange(termData.midterm_start_date, termData.midterm_end_date, 'Midterm dates');
    } catch (err) {
        errors.push(err.message);
    }

    try {
        validateDateRange(termData.final_start_date, termData.final_end_date, 'Final exam dates');
    } catch (err) {
        errors.push(err.message);
    }

    // Validate midterm within term
    try {
        validateDateWithinRange(
            termData.midterm_start_date,
            termData.term_start_date,
            termData.term_end_date,
            'Midterm start date'
        );
        validateDateWithinRange(
            termData.midterm_end_date,
            termData.term_start_date,
            termData.term_end_date,
            'Midterm end date'
        );
    } catch (err) {
        errors.push(err.message);
    }

    // Validate final within term
    try {
        validateDateWithinRange(
            termData.final_start_date,
            termData.term_start_date,
            termData.term_end_date,
            'Final exam start date'
        );
        validateDateWithinRange(
            termData.final_end_date,
            termData.term_start_date,
            termData.term_end_date,
            'Final exam end date'
        );
    } catch (err) {
        errors.push(err.message);
    }

    // Validate no overlap between midterm and final
    try {
        validateNoDateOverlap(
            termData.midterm_start_date,
            termData.midterm_end_date,
            termData.final_start_date,
            termData.final_end_date,
            'Midterm',
            'Final exam'
        );
    } catch (err) {
        errors.push(err.message);
    }

    if (errors.length > 0) {
        throw new ValidationError('Validation failed', null, errors);
    }

    return true;
}

/**
 * Compute term status based on current date
 * NOT stored in database - computed dynamically
 */
export function computeTermStatus(termEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(termEndDate);
    endDate.setHours(0, 0, 0, 0);

    return today <= endDate ? 'ดำเนินการ' : 'สิ้นสุด';
}

/**
 * Normalize term data (trim strings, convert numbers)
 */
export function normalizeTermData(termData) {
    return {
        academic_year: validateAcademicYear(termData.academic_year),
        academic_sector: validateAcademicSector(termData.academic_sector),
        term_start_date: termData.term_start_date.trim(),
        term_end_date: termData.term_end_date.trim(),
        midterm_start_date: termData.midterm_start_date.trim(),
        midterm_end_date: termData.midterm_end_date.trim(),
        final_start_date: termData.final_start_date.trim(),
        final_end_date: termData.final_end_date.trim(),
    };
}
