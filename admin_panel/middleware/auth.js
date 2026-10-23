import Admin from '../modules/auth/model.js';

export const adminAuth = async (req, res, next) => {
    try {
        // Extract token from various possible locations
        let token = null;

        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && typeof authHeader === 'string') {
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.slice(7).trim();
            } else {
                token = authHeader.trim();
            }
        }

        if (!token && req.headers['x-admin-token']) {
            token = req.headers['x-admin-token'];
        }

        if (!token && req.headers['admin_token']) {
            token = req.headers['admin_token'];
        }

        if (!token && req.headers.cookie) {
            const match = req.headers.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1]);
            }
        }

        if (!token && req.body && req.body.admin_token) {
            token = req.body.admin_token;
        }

        if (!token && req.query && (req.query.admin_token || req.query.token)) {
            token = req.query.admin_token || req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized: Admin authentication token is required',
            });
        }

        // Decode base64 token payload
        let payload;
        try {
            const decodedStr = Buffer.from(token, 'base64').toString('utf8');
            payload = JSON.parse(decodedStr);
        } catch {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized: Invalid token format',
            });
        }

        if (!payload || !payload.id) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized: Invalid session token',
            });
        }

        // Verify admin exists and is active in database
        const admin = await Admin.findById(payload.id);
        if (!admin) {
            return res.status(401).json({
                status: false,
                message: 'Unauthorized: Admin user not found',
            });
        }

        if (!admin.is_active) {
            return res.status(403).json({
                status: false,
                message: 'Forbidden: Admin account is inactive',
            });
        }

        // Attach authenticated admin to request object
        req.admin = admin;
        return next();
    } catch (error) {
        console.error('[Admin Auth Middleware Error]:', error);
        return res.status(500).json({
            status: false,
            message: 'Internal server error during authentication',
        });
    }
};

export default adminAuth;
