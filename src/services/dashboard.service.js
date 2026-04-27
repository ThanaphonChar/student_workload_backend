/**
 * Dashboard Service
 * Business logic สำหรับ Dashboard
 * - Validation
 * - Data transformation
 * - Error handling
 */

import { pool } from '../config/db.js';
import * as dashboardRepository from '../repositories/dashboard.repository.js';
import { findTermWithStats } from '../repositories/term.repository.js';

export function parseOptionalPositiveInt(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        const error = new Error(`${fieldName} ไม่ถูกต้อง`);
        error.statusCode = 400;
        throw error;
    }
    return parsed;
}

export function parseYearLevels(value) {
    if (!value) return [1, 2, 3, 4];
    const parsed = String(value)
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((num) => Number.isInteger(num) && num > 0);
    if (parsed.length === 0) {
        const error = new Error('years ไม่ถูกต้อง');
        error.statusCode = 400;
        throw error;
    }
    return parsed;
}

/**
 * ดึงข้อมูล Summary Statistics
 * @param {number} termId - ID ของ term (optional, ถ้าไม่ระบุจะใช้ active term)
 * @returns {Promise<Object>} สถิติรวม
 */
export async function getSummaryStatistics(termId = null) {
    const client = await pool.connect();
    try {
        let targetTermId = termId;

        if (!targetTermId) {
            const activeTerm = await dashboardRepository.getActiveTerm(client);
            if (!activeTerm) {
                throw new Error('ไม่พบ term ที่เปิดใช้งาน กรุณาเปิดใช้งาน term ก่อน');
            }
            targetTermId = activeTerm.id;
        } else {
            const term = await findTermWithStats(pool, targetTermId);
            if (!term) {
                throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
            }
        }

        const stats = await dashboardRepository.getSummaryStats(client, targetTermId);

        return {
            termId: targetTermId,
            statistics: {
                totalSubjects: stats.totalSubjects,
                outlineSubmitted: {
                    count: stats.outlineSubmitted,
                    total: stats.totalSubjects,
                    percentage: stats.totalSubjects > 0
                        ? Math.round((stats.outlineSubmitted / stats.totalSubjects) * 100)
                        : 0
                },
                workloadFilled: {
                    count: stats.workloadFilled,
                    total: stats.totalSubjects,
                    percentage: stats.totalSubjects > 0
                        ? Math.round((stats.workloadFilled / stats.totalSubjects) * 100)
                        : 0
                },
                reportSubmitted: {
                    count: stats.reportSubmitted,
                    total: stats.totalSubjects,
                    percentage: stats.totalSubjects > 0
                        ? Math.round((stats.reportSubmitted / stats.totalSubjects) * 100)
                        : 0
                }
            }
        };
    } finally {
        client.release();
    }
}

/**
 * ดึงค่าเฉลี่ยภาระงานแยกตามปี
 * @param {number} termId - ID ของ term (optional)
 * @returns {Promise<Object>} ข้อมูลค่าเฉลี่ยแยกตามปี
 */
export async function getAverageWorkload(termId = null) {
    const client = await pool.connect();
    try {
        let targetTermId = termId;

        if (!targetTermId) {
            const activeTerm = await dashboardRepository.getActiveTerm(client);
            if (!activeTerm) {
                throw new Error('ไม่พบ term ที่เปิดใช้งาน');
            }
            targetTermId = activeTerm.id;
        } else {
            const term = await findTermWithStats(pool, targetTermId);
            if (!term) {
                throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
            }
        }

        const yearData = await dashboardRepository.getAverageWorkloadByYear(client, targetTermId);

        return {
            termId: targetTermId,
            averageByYear: yearData
        };
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูล Workload Chart
 * @param {number} termId - ID ของ term (optional)
 * @param {Array<number>} yearLevels - ระดับชั้นปีที่ต้องการดู (default [1,2,3,4])
 * @returns {Promise<Object>} ข้อมูล chart
 */
export async function getWorkloadChart(termId = null, yearLevels = [1, 2, 3, 4]) {
    if (!Array.isArray(yearLevels) || yearLevels.length === 0) {
        throw new Error('yearLevels ต้องเป็น array และมีค่าอย่างน้อย 1 ตัว');
    }

    const validYears = yearLevels.filter(y => Number.isInteger(y) && y >= 1 && y <= 4);
    if (validYears.length === 0) {
        throw new Error('yearLevels ต้องมีค่าระหว่าง 1-4 เท่านั้น');
    }

    const client = await pool.connect();
    try {
        let targetTermId = termId;
        let termInfo = null;

        if (!targetTermId) {
            const activeTerm = await dashboardRepository.getActiveTerm(client);
            if (!activeTerm) {
                throw new Error('ไม่พบ term ที่เปิดใช้งาน');
            }
            targetTermId = activeTerm.id;
            termInfo = activeTerm;
        } else {
            const term = await findTermWithStats(pool, targetTermId);
            if (!term) {
                throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
            }
            termInfo = term;
        }

        const chartData = await dashboardRepository.getWorkloadChartData(client, targetTermId, validYears);

        return {
            termId: targetTermId,
            semester: termInfo.academic_sector,
            termYear: termInfo.academic_year,
            yearLevels: validYears,
            chartData: chartData
        };
    } finally {
        client.release();
    }
}

/**
 * ดึงข้อมูล Active Term
 * @returns {Promise<Object|null>} ข้อมูล active term
 */
export async function getActiveTermInfo() {
    const client = await pool.connect();
    try {
        return await dashboardRepository.getActiveTerm(client);
    } finally {
        client.release();
    }
}

/**
 * ดึง term subjects พร้อม workload รวมต่อสัปดาห์ (server-side computed)
 * No N+1 — single query returns all data
 *
 * @param {number} termId - Term ID
 * @returns {Promise<Array>} Array of subjects with workload data
 */
export async function getStudentSubjects(termId) {
    console.log('[getStudentSubjects] Input termId:', termId, 'type:', typeof termId);

    const parsed = parseOptionalPositiveInt(termId, 'termId');
    console.log('[getStudentSubjects] Parsed termId:', parsed);

    if (!parsed) {
        const err = new Error('termId ไม่ถูกต้อง');
        err.statusCode = 400;
        throw err;
    }

    const client = await pool.connect();
    try {
        console.log('[getStudentSubjects] Calling getStudentSubjectsWithWorkload with termId:', parsed);
        const result = await dashboardRepository.getStudentSubjectsWithWorkload(client, parsed);
        console.log('[getStudentSubjects] Success. Got', result.length, 'subjects');
        return result;
    } catch (error) {
        console.error('[getStudentSubjects] Error:', error.message, error.stack);
        throw error;
    } finally {
        client.release();
    }
}

export default {
    getSummaryStatistics,
    getAverageWorkload,
    getWorkloadChart,
    getActiveTermInfo,
    getStudentSubjects
};
