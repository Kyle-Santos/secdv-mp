// controllers/routeAdmin.js
// Admin-only routes for managing logs and system administration

const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { getLogs, getRecentLogs, clearLogs, downloadLogs } = require('../middleware/error');

function add(server) {
    // View all logs - admin only (Requirement 2.4.3)
    server.get('/admin/logs', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], getLogs);

    // Get recent logs (JSON format) - admin only
    server.get('/admin/logs/recent', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], getRecentLogs);

    // Download logs as file - admin only
    server.get('/admin/logs/download', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], downloadLogs);

    // Clear logs - admin only
    server.post('/admin/logs/clear', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], clearLogs);

    // Admin dashboard page (if needed)
    // server.get('/admin/dashboard', [
    //     requireAuth,
    //     requireRole(ROLES.ADMIN)
    // ], function(req, res) {
    //     res.render('admin-dashboard', {
    //         layout: 'index',
    //         title: 'Admin Dashboard',
    //         isAdmin: true,
    //         username: req.session.username
    //     });
    // });

    // View logs page (not needed)
    // server.get('/admin/view-logs', [
    //     requireAuth,
    //     requireRole(ROLES.ADMIN)
    // ], function(req, res) {
    //     res.render('admin-logs', {
    //         layout: 'index',
    //         title: 'System Logs',
    //         isAdmin: true,
    //         username: req.session.username
    //     });
    // });
}

module.exports.add = add;