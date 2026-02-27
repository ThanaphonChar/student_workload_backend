/**
 * Dashboard Service
 * Business logic สำหรับ Dashboard
 * - Validation
 * - Data transformation
 * - Error handling
 */

import * as dashboardRepository from '../repositories/dashboard.repository.js';
import { findTermWithStats } from '../repositories/term.repository.js';

/**
 * ดึงข้อมูล Summary Statistics
 * @param {number} termId - ID ของ term (optional, ถ้าไม่ระบุจะใช้ active term)
 * @returns {Promise<Object>} สถิติรวม
 */
export async function getSummaryStatistics(termId = null) {
    // ถ้าไม่ระบุ termId ให้ใช้ active term
    let targetTermId = termId;

    if (!targetTermId) {
        const activeTerm = await dashboardRepository.getActiveTerm();
        if (!activeTerm) {
            throw new Error('ไม่พบ term ที่เปิดใช้งาน กรุณาเปิดใช้งาน term ก่อน');
        }
        targetTermId = activeTerm.id;
    } else {
        // ตรวจสอบว่า term ที่ระบุมีอยู่จริง
        const term = await findTermWithStats(targetTermId);
        if (!term) {
            throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
        }
    }

    // ดึงข้อมูลสถิติ
    const stats = await dashboardRepository.getSummaryStats(targetTermId);

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
}

/**
 * ดึงค่าเฉลี่ยภาระงานแยกตามปี
 * @param {number} termId - ID ของ term (optional)
 * @returns {Promise<Object>} ข้อมูลค่าเฉลี่ยแยกตามปี
 */
export async function getAverageWorkload(termId = null) {
    // ถ้าไม่ระบุ termId ให้ใช้ active term
    let targetTermId = termId;

    if (!targetTermId) {
        const activeTerm = await dashboardRepository.getActiveTerm();
        if (!activeTerm) {
            throw new Error('ไม่พบ term ที่เปิดใช้งาน');
        }
        targetTermId = activeTerm.id;
    } else {
        // ตรวจสอบว่า term มีอยู่จริง
        const term = await findTermWithStats(targetTermId);
        if (!term) {
            throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
        }
    }

    const yearData = await dashboardRepository.getAverageWorkloadByYear(targetTermId);

    return {
        termId: targetTermId,
        averageByYear: yearData
    };
}

/**
 * ดึงข้อมูล Workload Chart
 * @param {number} termId - ID ของ term (optional)
 * @param {Array<number>} yearLevels - ระดับชั้นปีที่ต้องการดู (default [1,2,3,4])
 * @returns {Promise<Object>} ข้อมูล chart
 */
export async function getWorkloadChart(termId = null, yearLevels = [1, 2, 3, 4]) {
    // Validate yearLevels
    if (!Array.isArray(yearLevels) || yearLevels.length === 0) {
        throw new Error('yearLevels ต้องเป็น array และมีค่าอย่างน้อย 1 ตัว');
    }

    const validYears = yearLevels.filter(y => Number.isInteger(y) && y >= 1 && y <= 4);
    if (validYears.length === 0) {
        throw new Error('yearLevels ต้องมีค่าระหว่าง 1-4 เท่านั้น');
    }

    // ถ้าไม่ระบุ termId ให้ใช้ active term
    let targetTermId = termId;
    let termInfo = null;

    if (!targetTermId) {
        const activeTerm = await dashboardRepository.getActiveTerm();
        if (!activeTerm) {
            throw new Error('ไม่พบ term ที่เปิดใช้งาน');
        }
        targetTermId = activeTerm.id;
        termInfo = activeTerm;
    } else {
        const term = await findTermWithStats(targetTermId);
        if (!term) {
            throw new Error(`ไม่พบ term ที่มี ID = ${targetTermId}`);
        }
        termInfo = term;
    }

    const chartData = await dashboardRepository.getWorkloadChartData(targetTermId, validYears);

    return {
        termId: targetTermId,
        semester: termInfo.academic_sector,
        termYear: termInfo.academic_year,
        yearLevels: validYears,
        chartData: chartData
    };
}

/**
 * ดึงข้อมูล Active Term
 * @returns {Promise<Object|null>} ข้อมูล active term
 */
export async function getActiveTermInfo() {
    const activeTerm = await dashboardRepository.getActiveTerm();
    return activeTerm;
}

export default {
    getSummaryStatistics,
    getAverageWorkload,
    getWorkloadChart,
    getActiveTermInfo
};
