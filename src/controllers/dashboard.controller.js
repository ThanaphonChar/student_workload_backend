/**
 * Dashboard Controller
 * จัดการ HTTP requests/responses สำหรับ Dashboard
 */

import * as dashboardService from '../services/dashboard.service.js';

/**
 * GET /api/dashboard/summary
 * ดึงข้อมูลสถิติรวมสำหรับ Dashboard
 * 
 * Query Parameters:
 * - termId (optional): ID ของ term ที่ต้องการดู (ถ้าไม่ระบุจะใช้ active term)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     termId: 1,
 *     statistics: {
 *       totalSubjects: 20,
 *       outlineSubmitted: { count: 15, total: 20, percentage: 75 },
 *       workloadFilled: { count: 10, total: 20, percentage: 50 },
 *       reportSubmitted: { count: 5, total: 20, percentage: 25 }
 *     }
 *   }
 * }
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
 * 
 * Query Parameters:
 * - termId (optional): ID ของ term
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     termId: 1,
 *     averageByYear: [
 *       { yearLevel: 1, avgHours: 19.2 },
 *       { yearLevel: 2, avgHours: 22.6 },
 *       { yearLevel: 3, avgHours: 29.3 },
 *       { yearLevel: 4, avgHours: 29.3 }
 *     ]
 *   }
 * }
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
 * 
 * Query Parameters:
 * - termId (optional): ID ของ term
 * - years (optional): ระดับชั้นปีที่ต้องการดู เช่น "1,2" หรือ "1,2,3,4" (default: "1,2,3,4")
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     termId: 1,
 *     semester: 1,  // academic_sector
 *     termYear: 2568,  // academic_year
 *     yearLevels: [1, 2, 3, 4],
 *     chartData: [
 *       { week: 1, totalHours: 30.5 },
 *       { week: 2, totalHours: 28.0 },
 *       ...
 *       { week: 16, totalHours: 45.2 }
 *     ]
 *   }
 * }
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

/**
 * GET /api/dashboard/active-term
 * ดึงข้อมูล active term
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     academic_year: 2568,
 *     academic_sector: 1,
 *     term_start_date: "2025-01-01",
 *     term_end_date: "2025-05-31"
 *   }
 * }
 */
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
