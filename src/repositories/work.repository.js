/**
 * Work Repository
 * 
 * จัดการการดำเนินการ database สำหรับ workload
 * เฉพาะ SQL queries เท่านั้น - ไม่มี business logic
 * 
 * Convention:
 * - ใช้ client object จาก caller เพื่อควบคุม transaction
 * - ทุกฟังก์ชันเป็น async
 * - Return raw data จาก database
 */

/**
 * สร้าง workload ใหม่
 * 
 * @param {object} client - PostgreSQL client (จาก connection pool)
 * @param {number} termSubjectId - ID ของ term_subject
 * @param {object} workData - ข้อมูล workload {work_title, description, start_date, end_date, hours_per_week}
 * @param {number} userId - ID ของผู้สร้าง (academic officer)
 * 
 * @returns {object} workload ที่สร้าง (พร้อม id, created_at, etc.)
 * @throws {Error} ถ้าเกิดข้อผิดพลาด database
 */
export async function insertWork(client, termSubjectId, workData, userId) {
    const sql = `
        INSERT INTO work_details (
            term_subject_id,
            work_title,
            description,
            start_date,
            end_date,
            hours_per_week,
            created_by,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
    `;

    const values = [
        termSubjectId,
        workData.work_title,
        workData.description || null,
        workData.start_date,
        workData.end_date,
        workData.hours_per_week,
        userId,
    ];

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * ดึงข้อมูล workload ทั้งหมดตาม term_subject ID
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} termSubjectId - ID ของ term_subject
 * 
 * @returns {array} array ของ workload objects
 */
export async function findWorkByTermSubjectId(client, termSubjectId) {
    const sql = `
        SELECT 
            id,
            term_subject_id,
            work_title,
            description,
            start_date,
            end_date,
            hours_per_week,
            created_at,
            created_by,
            updated_at,
            updated_by
        FROM work_details
        WHERE term_subject_id = $1
        ORDER BY created_at DESC
    `;

    const result = await client.query(sql, [termSubjectId]);
    return result.rows;
}

/**
 * ดึงข้อมูล workload ตาม work ID
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} workId - ID ของ workload
 * 
 * @returns {object|null} workload object หรือ null ถ้าไม่พบ
 */
export async function findWorkById(client, workId) {
    const sql = `
        SELECT 
            id,
            term_subject_id,
            work_title,
            description,
            start_date,
            end_date,
            hours_per_week,
            created_at,
            created_by,
            updated_at,
            updated_by
        FROM work_details
        WHERE id = $1
    `;

    const result = await client.query(sql, [workId]);
    return result.rows[0] || null;
}

/**
 * อัพเดท workload
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} workId - ID ของ workload ที่ต้องแก้ไข
 * @param {object} updateData - ข้อมูลที่ต้องอัพเดท (partial object)
 * @param {number} userId - ID ของผู้แก้ไข
 * 
 * @returns {object} workload ที่อัพเดท
 */
export async function updateWork(client, workId, updateData, userId) {
    // สร้าง SET clause แบบ dynamic
    const allowedFields = ['work_title', 'description', 'start_date', 'end_date', 'hours_per_week'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            updates.push(`${field} = $${paramCount}`);
            values.push(updateData[field]);
            paramCount++;
        }
    }

    // เพิ่ม updated_at และ updated_by
    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount}`);
    values.push(userId);
    paramCount++;

    // เพิ่ม workId ในท้ายสุด
    values.push(workId);

    const sql = `
        UPDATE work_details
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
    `;

    const result = await client.query(sql, values);
    return result.rows[0];
}

/**
 * ลบ workload
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} workId - ID ของ workload ที่ต้องลบ
 * 
 * @returns {boolean} true ถ้าลบสำเร็จ
 */
export async function deleteWork(client, workId) {
    const sql = `
        DELETE FROM work_details
        WHERE id = $1
        RETURNING id
    `;

    const result = await client.query(sql, [workId]);
    return result.rowCount > 0;
}

/**
 * ตรวจสอบว่า workload มีอยู่หรือไม่ สำหรับ term_subject นั้น
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} termSubjectId - ID ของ term_subject
 * 
 * @returns {boolean} true ถ้ามี workload อยู่แล้ว
 */
export async function existsByTermSubjectId(client, termSubjectId) {
    const sql = `
        SELECT COUNT(*) FROM work_details
        WHERE term_subject_id = $1
    `;

    const result = await client.query(sql, [termSubjectId]);
    return parseInt(result.rows[0].count) > 0;
}

/**
 * ดึงข้อมูล workload พร้อมข้อมูลเสริมจาก term_subjects และ users
 * (ใช้สำหรับ GET detail view)
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} workId - ID ของ workload
 * 
 * @returns {object|null} workload พร้อมข้อมูลเสริม
 */
export async function findWorkWithDetails(client, workId) {
    const sql = `
        SELECT 
            w.id,
            w.term_subject_id,
            w.work_title,
            w.description,
            w.start_date,
            w.end_date,
            w.hours_per_week,
            w.created_at,
            w.created_by,
            w.updated_at,
            w.updated_by,
            -- ข้อมูลเสริมจาก term_subjects
            ts.term_id,
            ts.subject_id,
            ts.is_active,
            -- ข้อมูลผู้สร้างและแก้ไข
            cu.full_name AS created_by_name,
            uu.full_name AS updated_by_name
        FROM work_details w
        LEFT JOIN term_subjects ts ON w.term_subject_id = ts.id
        LEFT JOIN users cu ON w.created_by = cu.id
        LEFT JOIN users uu ON w.updated_by = uu.id
        WHERE w.id = $1
    `;

    const result = await client.query(sql, [workId]);
    return result.rows[0] || null;
}

/**
 * ดึง workload ทั้งหมดของ term (สำหรับรายงาน/listing)
 * 
 * @param {object} client - PostgreSQL client
 * @param {number} termId - ID ของ term
 * 
 * @returns {array} array ของ workload objects
 */
export async function findWorksByTermId(client, termId) {
    const sql = `
        SELECT 
            w.id,
            w.term_subject_id,
            w.work_title,
            w.description,
            w.start_date,
            w.end_date,
            w.hours_per_week,
            w.created_at,
            w.created_by,
            w.updated_at,
            w.updated_by,
            ts.subject_id,
            cu.full_name AS created_by_name
        FROM work_details w
        INNER JOIN term_subjects ts ON w.term_subject_id = ts.id
        LEFT JOIN users cu ON w.created_by = cu.id
        WHERE ts.term_id = $1
        ORDER BY w.created_at DESC
    `;

    const result = await client.query(sql, [termId]);
    return result.rows;
}
