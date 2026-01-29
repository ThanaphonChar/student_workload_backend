/**
 * User Model
 * โมเดลสำหรับ User entity
 * 
 * ❌ ห้ามมี database operations
 * ❌ ห้ามรู้จัก Express
 * ✅ เป็น data structure และ transformation เท่านั้น
 */

export class User {
    constructor(data) {
        this.id = data.id || null;
        this.username = data.username;
        this.firstNameTh = data.first_name_th || '';
        this.lastNameTh = data.last_name_th || '';
        this.firstNameEn = data.first_name_en || '';
        this.lastNameEn = data.last_name_en || '';
        this.email = data.email ? data.email.toLowerCase().trim() : '';
        this.userType = data.user_type || null;
        this.department = data.department || null;
        this.faculty = data.faculty || null;
        this.isActive = data.is_active !== undefined ? data.is_active : true;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    /**
     * Factory: สร้าง User จาก database row
     * @param {Object} dbRow - Database row object
     * @returns {User}
     */
    static fromDatabase(dbRow) {
        return new User(dbRow);
    }

    /**
     * Factory: สร้าง User จากข้อมูลที่ parse แล้ว
     * @param {Object} userData - ข้อมูล user ที่ parse ชื่อแล้ว
     * @returns {User}
     */
    static create(userData) {
        return new User({
            username: userData.username,
            first_name_th: userData.firstNameTh,
            last_name_th: userData.lastNameTh,
            first_name_en: userData.firstNameEn,
            last_name_en: userData.lastNameEn,
            email: userData.email,
            user_type: userData.userType,
            department: userData.department,
            faculty: userData.faculty,
            is_active: true,
        });
    }

    /**
     * แปลงเป็นข้อมูลสำหรับ insert ลง database
     * @returns {Object}
     */
    toInsertData() {
        return {
            username: this.username,
            first_name_th: this.firstNameTh,
            last_name_th: this.lastNameTh,
            first_name_en: this.firstNameEn || null,
            last_name_en: this.lastNameEn || null,
            email: this.email,
            user_type: this.userType || null,
            department: this.department || null,
            faculty: this.faculty || null,
            is_active: this.isActive,
        };
    }

    /**
     * ดึงชื่อเต็มภาษาไทย
     * @returns {string}
     */
    getFullNameTh() {
        return `${this.firstNameTh} ${this.lastNameTh}`.trim();
    }

    /**
     * ดึงชื่อเต็มภาษาอังกฤษ
     * @returns {string}
     */
    getFullNameEn() {
        return `${this.firstNameEn} ${this.lastNameEn}`.trim();
    }

    /**
     * ตรวจสอบความถูกต้องของข้อมูล
     * @returns {boolean}
     */
    isValid() {
        return this.email && this.email.length > 0;
    }

    /**
     * แปลงเป็น JSON (สำหรับ response)
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            firstNameTh: this.firstNameTh,
            lastNameTh: this.lastNameTh,
            firstNameEn: this.firstNameEn,
            lastNameEn: this.lastNameEn,
            email: this.email,
            userType: this.userType,
            department: this.department,
            faculty: this.faculty,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
