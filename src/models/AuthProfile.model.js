/**
 * AuthProfile Model
 * โมเดลสำหรับข้อมูล Authentication จาก TU API
 * 
 * ❌ ห้ามเข้าถึง Database
 * ❌ ห้ามรู้จัก Express
 * ✅ เป็น data structure และ validation เท่านั้น
 */

export class AuthProfile {
    constructor(data) {
        this.status = data.status || false;
        this.message = data.message || '';
        this.type = data.type || ''; // 'student' หรือ 'employee'
        this.username = data.username || '';
        this.displayNameTh = data.displayname_th || '';
        this.displayNameEn = data.displayname_en || '';
        this.email = data.email ? data.email.toLowerCase().trim() : '';
        this.department = data.department || '';
        this.faculty = data.faculty || ''; // มีแค่ student
        this.organization = data.organization || ''; // มีแค่ employee
    }

    /**
     * Factory: สร้างจาก TU Auth API response
     * @param {Object} tuAuthResponse - Response จาก TU Auth API
     * @returns {AuthProfile}
     */
    static fromTUAuth(tuAuthResponse) {
        return new AuthProfile(tuAuthResponse);
    }

    /**
     * ตรวจสอบว่าเป็น student หรือไม่
     * @returns {boolean}
     */
    isStudent() {
        return this.type === 'student';
    }

    /**
     * ตรวจสอบว่าเป็น employee หรือไม่
     * @returns {boolean}
     */
    isEmployee() {
        return this.type === 'employee';
    }

    /**
     * ตรวจสอบว่า authentication สำเร็จหรือไม่
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.status === true;
    }

    /**
     * Validate ข้อมูลที่จำเป็น
     * @returns {boolean}
     */
    isValid() {
        return (
            this.status === true &&
            this.email.length > 0 &&
            this.type.length > 0 &&
            (this.type === 'student' || this.type === 'employee')
        );
    }

    /**
     * แปลงเป็น JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            status: this.status,
            message: this.message,
            type: this.type,
            username: this.username,
            displayNameTh: this.displayNameTh,
            displayNameEn: this.displayNameEn,
            email: this.email,
            department: this.department,
            faculty: this.faculty,
            organization: this.organization,
        };
    }
}
