/**
 * Dashboard Controller
 * จัดการ HTTP requests/responses สำหรับ Dashboard
 */

import * as dashboardService from '../services/dashboard.service.js';

/**
 * GET /api/dashboard/summary
 * ดึงข้อมูลสถิติรวมสำหรับ Dashboard
 */
export async function getSummaryStatistics(req, res) {
    try {
        const termId = req.query.termId ? parseInt(req.query.termId) : null;

        const result = await dashboardService.getSummaryStatistics(termId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getSummaryStatistics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ'
        });
    }
}

/**
 * GET /api/dashboard/average-workload
 * ดึงค่าเฉลี่ยภาระงานแยกตามปีการศึกษา
 */
export async function getAverageWorkload(req, res) {
    try {
        const termId = req.query.termId ? parseInt(req.query.termId) : null;

        const result = await dashboardService.getAverageWorkload(termId);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error in getAverageWorkload:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลค่าเฉลี่ย'
        });
    }
}

/**
 * GET /api/dashboard/workload-chart
 * ดึงข้อมูลภาระงานแยกตามสัปดาห์สำหรับสร้าง chart
 */
export async function getWorkloadChart(req, res) {
    try {
        const termId = req.query.termId ? parseInt(req.query.termId) : null;

        // Parse years parameter
        let yearLevels = [1, 2, 3, 4]; // default
        if (req.query.years) {
            yearLevels = req.query.years
                .split(',')
                .map(y => parseInt(y.trim()))
                .filter(y => !isNaN(y));
        }

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
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล chart'
        });
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
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล active term'
        });
    }
}

export default {
    getSummaryStatistics,
    getAverageWorkload,
    getWorkloadChart,
    getActiveTerm
};
