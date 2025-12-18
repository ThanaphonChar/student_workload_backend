import axios from 'axios';
import config from '../config/env.js';

/**
 * Instructor API Service
 * เรียกข้อมูลอาจารย์/พนักงานจาก TU API
 * 
 * ❌ ห้ามมี business logic
 * ✅ ทำแค่ integration กับ external API เท่านั้น
 */

const INSTRUCTOR_API_URL = config.tuApi.instructorsInfoUrl;
const API_KEY = config.tuApi.applicationKey;

/**
 * ดึงข้อมูลอาจารย์จาก email
 * 
 * @param {string} email - Email ของอาจารย์
 * @returns {Promise<Object|null>} - ข้อมูลอาจารย์ หรือ null ถ้าไม่พบ
 * @throws {Error} - ถ้า API call ล้มเหลว
 */
export async function fetchInstructorByEmail(email) {
    try {
        console.log(`[Instructor API] 🔍 กำลังดึงข้อมูลอาจารย์: ${email}`);

        const url = `${INSTRUCTOR_API_URL}?Email=${encodeURIComponent(email)}`;

        const response = await axios.get(url, {
            headers: {
                'Application-Key': API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 วินาที
        });

        const data = response.data;

        // จัดการ response structure ที่แตกต่างกัน
        if (!data || data.status === false) {
            console.log(`[Instructor API] ⚠️ ไม่พบข้อมูลอาจารย์: ${email}`);
            return null;
        }

        // ดึงข้อมูลอาจารย์
        let instructorData = null;

        if (Array.isArray(data.data) && data.data.length > 0) {
            instructorData = data.data[0]; // เอาตัวแรก
        } else if (data.data && typeof data.data === 'object') {
            instructorData = data.data;
        }

        if (!instructorData) {
            console.log(`[Instructor API] ⚠️ ไม่พบข้อมูลอาจารย์: ${email}`);
            return null;
        }

        console.log(`[Instructor API] ✅ พบข้อมูลอาจารย์: ${instructorData.Email}`);

        return {
            firstNameTh: instructorData.First_Name_Th || '',
            lastNameTh: instructorData.Last_Name_Th || '',
            firstNameEn: instructorData.First_Name_En || '',
            lastNameEn: instructorData.Last_Name_En || '',
            facultyNameTh: instructorData.Faculty_Name_Th || '',
            email: instructorData.Email || email,
        };

    } catch (error) {
        if (error.response) {
            console.error(`[Instructor API] ❌ API error: ${error.response.status}`, error.response.data);
            throw new Error(`Instructor API returned status ${error.response.status}`);
        } else if (error.request) {
            console.error('[Instructor API] ❌ ไม่ได้รับ response จาก Instructor API:', error.message);
            throw new Error('Instructor API is unavailable');
        } else {
            console.error('[Instructor API] ❌ Request error:', error.message);
            throw new Error('Failed to fetch instructor data');
        }
    }
}

/**
 * ตรวจสอบการตั้งค่า API
 * @returns {boolean}
 */
export function validateConfiguration() {
    if (!API_KEY || API_KEY.length === 0) {
        console.error('[Instructor API] ❌ Application-Key ไม่ได้ถูกตั้งค่า');
        return false;
    }

    if (!INSTRUCTOR_API_URL || INSTRUCTOR_API_URL.length === 0) {
        console.error('[Instructor API] ❌ Instructor API URL ไม่ได้ถูกตั้งค่า');
        return false;
    }

    return true;
}
