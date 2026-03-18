import axios from 'axios';
import config from '../config/env.js';

const DEFAULT_INSTRUCTORS_URL = 'https://restapi.tu.ac.th/api/v2/profile/Instructors/info/';
const DEFAULT_FACULTY_TH = 'คณะวิทยาศาสตร์และเทคโนโลยี';

export async function fetchInstructorsFromTuApi() {
    const endpoint = config.tuApi.instructorsInfoUrl || DEFAULT_INSTRUCTORS_URL;
    const apiKey = process.env.TU_API_KEY || config.tuApi.applicationKey;

    if (!apiKey) {
        throw new Error('ไม่พบการตั้งค่า TU API KEY');
    }

    const response = await axios.get(endpoint, {
        params: {
            Faculty_Name_Th: DEFAULT_FACULTY_TH,
        },
        headers: {
            'Content-Type': 'application/json',
            'Application-Key': apiKey,
        },
        timeout: 15000,
    });

    const payload = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
            ? response.data
            : [];

    return payload.map((item) => ({
        tu_id: String(item.TU_ID || item.Employeecode || item.Employee_Code || item.UserName || item.Email || '').trim(),
        first_name_th: item.First_Name_Th || '',
        last_name_th: item.Last_Name_Th || '',
        first_name_en: item.First_Name_En || '',
        last_name_en: item.Last_Name_En || '',
        email: (item.Email || '').toLowerCase(),
        department: item.Department || item.Department_Name_Th || '',
        faculty: item.Faculty_Name_Th || DEFAULT_FACULTY_TH,
    })).filter((item) => item.tu_id && item.email);
}
