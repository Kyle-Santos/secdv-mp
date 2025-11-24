// middleware/authMiddleware.js
// Single site-wide component to check access authorization (Requirement 2.2.1)
const { logAccessControlFailure } = require('./error');

const ROLES = {
    ADMIN: 'admin',
    OWNER: 'owner',
    REVIEWER: 'reviewer'
};

const PERMISSIONS = {
    ADMIN: [
        'view_logs',
        'manage_users',
        'delete_any_review',
        'delete_any_comment',
        'edit_any_review',
        'edit_any_comment',
        'view_all_profiles',
        'manage_condos'
    ],
    OWNER: [
        'create_review',
        'edit_own_review',
        'delete_own_review',
        'create_comment',
        'edit_own_comment',
        'delete_own_comment',
        'view_all_profiles',
        'like_review'
    ],
    REVIEWER: [
        'create_review',
        'edit_own_review',
        'delete_own_review',
        'create_comment',
        'edit_own_comment',
        'delete_own_comment',
        'like_review'
    ]
};

// Middleware to require authentication (Requirement 2.1.1)
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        // Access controls should fail securely with error messages (Requirement 2.2.2)
        res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Authentication required to access this resource' 
        });
    }
}

// Middleware to check if user has required role (Requirement 2.2.3)
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.isAuthenticated) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRole = req.session.role;

        if (!allowedRoles.includes(userRole)) {
            logAccessControlFailure(
                req.session.username || 'Unknown',
                req.originalUrl,
                req.method,
                `Insufficient role: expected one of [${allowedRoles.join(', ')}], got ${userRole}`,
                req.ip || req.connection.remoteAddress
            );
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
            });
        }

        next();
    };
}

// Middleware to check if user has specific permission
function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.session || !req.session.isAuthenticated) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRole = req.session.role;
        const userPermissions = PERMISSIONS[userRole.toUpperCase()] || [];

        const hasPermission = requiredPermissions.some(permission =>
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            logAccessControlFailure(
                req.session.username || 'Unknown',
                req.originalUrl,
                req.method,
                `Missing permission: need one of [${requiredPermissions.join(', ')}], user has [${userPermissions.join(', ')}]`,
                req.ip || req.connection.remoteAddress
            );
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
}

// Check if user owns the resource
function checkOwnership(getResourceOwnerId) {
    return async (req, res, next) => {
        try {
            const owners = await getResourceOwnerId(req);
            const currentUserId = req.session._id;
            let allowed = false;
            
            if (typeof owners === 'object') {
                const { reviewAuthor, condoOwner } = owners;
                allowed = [reviewAuthor, condoOwner].some(id => String(id) === String(currentUserId));
            } else {
                allowed = String(owners) === String(currentUserId);
            }

            if (req.session.role === ROLES.ADMIN) allowed = true;
            
            if (allowed) next();
            else res.status(403).json({ error: 'Forbidden', message: 'No permission to access this resource' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error', message: 'Error checking ownership' });
        }
    };
}

module.exports = {
    ROLES,
    PERMISSIONS,
    requireAuth,
    requireRole,
    requirePermission,
    checkOwnership
};
