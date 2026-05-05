-- Migration: เพิ่ม password_hash column สำหรับ guest users
-- password_hash จะเป็น NULL สำหรับ regular users (ใช้ TU API)
-- และจะมีค่าเฉพาะ guest users ที่ hash ด้วย bcrypt

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index สำหรับการ query guest users
CREATE INDEX IF NOT EXISTS idx_users_user_type_is_active ON users(user_type, is_active);
