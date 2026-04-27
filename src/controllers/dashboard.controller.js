/**
 * Dashboard Controller
 * จัดการ HTTP requests/responses สำหรับ Dashboard
 */

import * as dashboardService from '../services/dashboard.service.js';
import { parseOptionalPositiveInt, parseYearLevels } from '../services/dashboard.service.js';

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

/**
 * GET /api/dashboard/student-subjects
 * ดึง term subjects พร้อม workload รวมต่อสัปดาห์
 * Single query — no N+1
 */
export async function getStudentSubjects(req, res) {
    try {
        const termId = parseOptionalPositiveInt(req.query.termId, 'termId');
        const result = await dashboardService.getStudentSubjects(termId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getStudentSubjects:', error);
        return handleDashboardError(res, error, 'ไม่สามารถโหลดข้อมูลรายวิชาได้');
    }
}

export default {
    getSummaryStatistics,
    getAverageWorkload,
    getWorkloadChart,
    getActiveTerm,
    getStudentSubjects
};
