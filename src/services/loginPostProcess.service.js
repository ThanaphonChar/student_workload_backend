import { User } from '../models/user.model.js';
import { AuthProfile } from '../models/AuthProfile.model.js';
import * as userRepository from '../repositories/user.repository.js';
import * as roleRepository from '../repositories/role.repository.js';
import * as userRoleRepository from '../repositories/userRole.repository.js';
import * as instructorApiService from './instructorApi.service.js';
import { parseThaiName, parseEnglishName } from '../utils/nameParser.js';
import { isAllowedFaculty, getAllowedFacultyName } from '../utils/facultyChecker.js';

/**
 * Login Post-Process Service
 * จัดการ business logic หลังจาก login สำเร็จ
 * 
 * ❌ ห้ามจัดการ HTTP (req/res)
 * ✅ ทำ business logic orchestration
 * ✅ จัดการ transaction
 */

/**
 * ประมวลผลหลังจาก user login สำเร็จ
 * 
 * Flow:
 * 1. ตรวจสอบสิทธิ์การเข้าถึงตามคณะ
 * 2. กำหนดประเภทผู้ใช้ (Student/Professor)
 * 3. ดึงข้อมูลเพิ่มเติมถ้าจำเป็น (employee เท่านั้น)
 * 4. Sync ข้อมูล user เข้า database
 * 5. กำหนด role
 * 
 * @param {Object} tuAuthResponse - TU Auth API response
 * @returns {Promise<Object>} - { user: User, role: string, faculty: string }
 * @throws {Error} - ถ้าไม่ได้รับอนุญาตหรือ sync ล้มเหลว
 */
export async function processLoginUser(tuAuthResponse) {
    console.log('[Login Post-Process] 🔄 เริ่มประมวลผลหลัง login...');

    // 1. สร้าง AuthProfile model
    const authProfile = AuthProfile.fromTUAuth(tuAuthResponse);

    if (!authProfile.isValid()) {
        throw new Error('ข้อมูล authentication profile ไม่ถูกต้อง');
    }

    // 2. กำหนดคณะและ validate สิทธิ์การเข้าถึง
    let facultyNameTh = '';
    let userData = null;

    if (authProfile.isStudent()) {
        // นักศึกษา: คณะมาจาก auth response
        facultyNameTh = authProfile.faculty;
        userData = await processStudent(authProfile);

    } else if (authProfile.isEmployee()) {
        // พนักงาน: ต้องดึงคณะจาก Instructor API
        const result = await processEmployee(authProfile);
        facultyNameTh = result.facultyNameTh;
        userData = result.userData;

    } else {
        throw new Error(`ประเภทผู้ใช้ไม่รู้จัก: ${authProfile.type}`);
    }

    // 3. ตรวจสอบสิทธิ์การเข้าถึงตามคณะ
    if (!isAllowedFaculty(facultyNameTh)) {
        console.log(`[Login Post-Process] ❌ ไม่อนุญาตให้เข้าใช้งาน - คณะ: ${facultyNameTh}`);
        throw new Error(
            `ไม่อนุญาตให้เข้าใช้งาน อนุญาตเฉพาะ${getAllowedFacultyName()}เท่านั้น คณะของคุณ: ${facultyNameTh}`
        );
    }

    console.log(`[Login Post-Process] ✅ ตรวจสอบคณะผ่าน: ${facultyNameTh}`);

    // 4. Sync user เข้า database
    const user = await syncUserToDatabase(userData);

    // 5. กำหนด role เริ่มต้น (Student หรือ Professor)
    const primaryRoleName = authProfile.isStudent() ? 'Student' : 'Professor';
    await assignUserRole(user.id, primaryRoleName);

    // 6. ดึง roles ทั้งหมดของ user
    const userRoles = await getUserRoles(user.id);
    const roleNames = userRoles.map(r => r.name);

    console.log(`[Login Post-Process] ✅ ประมวลผลสำเร็จ: ${user.email} (${roleNames.join(', ')})`);

    return {
        user,
        roles: roleNames,
        faculty: facultyNameTh,
    };
}

/**
 * ประมวลผล student user
 * @param {AuthProfile} authProfile
 * @returns {Promise<Object>} - User data object
 */
async function processStudent(authProfile) {
    console.log('[Login Post-Process] 👨‍🎓 ประมวลผลนักศึกษา...');

    // แยกชื่อจาก displayname
    const thaiName = parseThaiName(authProfile.displayNameTh);
    const englishName = parseEnglishName(authProfile.displayNameEn);

    return {
        username: authProfile.username,
        firstNameTh: thaiName.firstName,
        lastNameTh: thaiName.lastName,
        firstNameEn: englishName.firstName,
        lastNameEn: englishName.lastName,
        email: authProfile.email,
        userType: authProfile.type,
        department: authProfile.department,
        faculty: authProfile.faculty,
    };
}

/**
 * ประมวลผล employee user
 * @param {AuthProfile} authProfile
 * @returns {Promise<Object>} - { facultyNameTh: string, userData: Object }
 */
async function processEmployee(authProfile) {
    console.log('[Login Post-Process] 👨‍🏫 ประมวลผลพนักงาน...');

    // fallback จาก TU Auth profile (ใช้ได้แม้ Instructor API ไม่พบข้อมูล)
    const thaiName = parseThaiName(authProfile.displayNameTh);
    const englishName = parseEnglishName(authProfile.displayNameEn);

    // ดึงข้อมูลอาจารย์จาก TU API (best effort)
    // ถ้า API ล้มเหลว/ไม่พบข้อมูล จะ fallback เป็นข้อมูลจาก TU Auth
    let instructorData = null;
    try {
        instructorData = await instructorApiService.fetchInstructorByEmail(authProfile.email);
    } catch (error) {
        console.warn(`[Login Post-Process] ⚠️ Instructor API ใช้งานไม่ได้ จะ fallback ไปใช้ TU Auth data: ${error.message}`);
    }

    const facultyNameTh =
        instructorData?.facultyNameTh ||
        authProfile.organization ||
        authProfile.department ||
        '';

    if (!facultyNameTh) {
        throw new Error(`ไม่พบข้อมูลคณะ/หน่วยงานสำหรับพนักงาน: ${authProfile.email}`);
    }

    return {
        facultyNameTh,
        userData: {
            // ต้องใช้ username จาก TU Auth เสมอ
            username: authProfile.username,
            firstNameTh: instructorData?.firstNameTh || thaiName.firstName,
            lastNameTh: instructorData?.lastNameTh || thaiName.lastName,
            firstNameEn: instructorData?.firstNameEn || englishName.firstName,
            lastNameEn: instructorData?.lastNameEn || englishName.lastName,
            email: authProfile.email,
            userType: authProfile.type,
            department: authProfile.department,
            faculty: facultyNameTh,
        },
    };
}

/**
 * Sync user เข้า database (สร้างถ้ายังไม่มี, ถ้ามีแล้วใช้ของเดิม)
 * @param {Object} userData - User data object
 * @returns {Promise<User>} - User model instance
 */
async function syncUserToDatabase(userData) {
    console.log(`[Login Post-Process] 💾 Sync ข้อมูล user: ${userData.email}`);

    // ตรวจสอบว่ามี user อยู่แล้วหรือไม่
    const existingUser = await userRepository.findByEmail(userData.email);

    if (existingUser) {
        console.log(`[Login Post-Process] ⏭️ User มีอยู่แล้ว: ${userData.email} (ID: ${existingUser.id})`);
        return existingUser;
    }

    // สร้าง user ใหม่
    const user = User.create({
        username: userData.username,
        firstNameTh: userData.firstNameTh,
        lastNameTh: userData.lastNameTh,
        firstNameEn: userData.firstNameEn,
        lastNameEn: userData.lastNameEn,
        email: userData.email,
        userType: userData.userType,
        department: userData.department,
        faculty: userData.faculty,
    });

    const createdUser = await userRepository.create(user);
    console.log(`[Login Post-Process] ✅ สร้าง user ใหม่: ${createdUser.email} (ID: ${createdUser.id})`);

    return createdUser;
}

/**
 * กำหนด role ให้ user (idempotent - ไม่สร้างซ้ำ)
 * @param {number} userId
 * @param {string} roleName - 'Student' หรือ 'Professor'
 * @returns {Promise<void>}
 */
async function assignUserRole(userId, roleName) {
    console.log(`[Login Post-Process] 🎭 กำหนด role "${roleName}" ให้ user ID: ${userId}`);

    // หา role จากชื่อ
    const role = await roleRepository.findByName(roleName);

    if (!role) {
        throw new Error(`ไม่พบ role: ${roleName}`);
    }

    // กำหนด role (idempotent - ไม่สร้างซ้ำ)
    const result = await userRoleRepository.assignRole(userId, role.id);

    if (result.inserted) {
        console.log(`[Login Post-Process] ✅ กำหนด role "${roleName}" ให้ user ID: ${userId} สำเร็จ`);
    } else {
        console.log(`[Login Post-Process] ⏭️ User ID ${userId} มี role "${roleName}" อยู่แล้ว`);
    }
}

/**
 * ดึง roles ทั้งหมดของ user
 * @param {number} userId
 * @returns {Promise<Array>} - Array of role objects [{ id, name }]
 */
async function getUserRoles(userId) {
    console.log(`[Login Post-Process] 🔍 ดึง roles ของ user ID: ${userId}`);

    const roles = await userRoleRepository.getUserRoles(userId);

    console.log(`[Login Post-Process] ✅ พบ ${roles.length} role(s): ${roles.map(r => r.name).join(', ')}`);

    return roles;
}
