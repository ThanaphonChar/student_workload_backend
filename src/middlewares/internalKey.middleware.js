/**
 * Internal Key Middleware
 * ป้องกัน internal endpoints ด้วย x-internal-key header
 * เปรียบเทียบกับ process.env.INTERNAL_API_KEY
 */

export function verifyInternalKey(req, res, next) {
    const key = req.headers['x-internal-key'];

    if (!key || key !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
        });
    }

    next();
}
