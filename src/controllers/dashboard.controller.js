/**
 * Dashboard Controller
 * จัดการ HTTP requests/responses สำหรับ Dashboard
 */

import * as dashboardService from '../services/dashboard.service.js';

function parseOptionalPositiveInt(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        const error = new Error(`${fieldName} ไม่ถูกต้อง`);
        error.statusCode = 400;
        throw error;
    }

    return parsed;
}

function parseYearLevels(value) {
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

function handleDashboardError(res, error, fallbackMessage) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: error.message || fallbackMessage,
    });
}

/**
 * GET /api/dashboard/summary
 * ดึงข้อมูลสถิติรวมสำหรับ Dashboard
 */
export async function getSummaryStatistics(req, res) {
    try {
        const termId = parseOptionalPositiveInt(req.query.termId, 'termId');

        const result = await dashboardService.getSummaryStatistics(termId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getSummaryStatistics:', error);
        return handleDashboardError(res, error, 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ');
    }
}

/**
 * GET /api/dashboard/average-workload
 * ดึงค่าเฉลี่ยภาระงานแยกตามปีการศึกษา
 */
export async function getAverageWorkload(req, res) {
    try {
        const termId = parseOptionalPositiveInt(req.query.termId, 'termId');

        const result = await dashboardService.getAverageWorkload(termId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getAverageWorkload:', error);
        return handleDashboardError(res, error, 'เกิดข้อผิดพลาดในการดึงข้อมูลค่าเฉลี่ย');
    }
}

/**
 * GET /api/dashboard/workload-chart
 * ดึงข้อมูลภาระงานแยกตามสัปดาห์สำหรับสร้าง chart
 */
export async function getWorkloadChart(req, res) {
    try {
        const termId = parseOptionalPositiveInt(req.query.termId, 'termId');
        const yearLevels = parseYearLevels(req.query.years);

        console.log('[getWorkloadChart] 📊 Request:', { termId, yearLevels });

        const result = await dashboardService.getWorkloadChart(termId, yearLevels);

        console.log('[getWorkloadChart] ✅ Result:', {
            termId: result.termId,
            semester: result.semester,
            termYear: result.termYear,
            chartDataLength: result.chartData?.length,
            sampleData: result.chartData?.slice(0, 3)
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getWorkloadChart:', error);
        return handleDashboardError(res, error, 'เกิดข้อผิดพลาดในการดึงข้อมูล chart');
    }
}

export async function getActiveTerm(req, res) {
    try {
        const activeTerm = await dashboardService.getActiveTermInfo();

        if (!activeTerm) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ term ที่เปิดใช้งาน'
            });
        }

        res.status(200).json({
            success: true,
            data: activeTerm
        });
    } catch (error) {
        console.error('Error in getActiveTerm:', error);
        return handleDashboardError(res, error, 'เกิดข้อผิดพลาดในการดึงข้อมูล active term');
    }
}

export default {
    getSummaryStatistics,
    getAverageWorkload,
    getWorkloadChart,
    getActiveTerm
};
