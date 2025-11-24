// controllers/routeAdmin.js
// Admin-only routes for managing logs and system administration

const userModel = require('../models/User');
const condoModel = require('../models/Condo');

const { changePassword } = require('../models/userFunctions');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { getLogs, getRecentLogs, clearLogs, downloadLogs } = require('../middleware/error');
const { validateTextLength, validateEmail, validateUsername } = require('../middleware/validation');

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

    // Admin dashboard page
    server.get('/admin/dashboard', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async function(req, res) {
        
        const users = await userModel.find().lean(); // all users

        // console.log(users);
        res.render('admin-dashboard', {
            layout: 'index',
            title: 'Admin Dashboard',
            isAdmin: true,
            username: req.session.username,
            users: users
        });
    });



    
    // CREATE USER PAGE
    server.get('/admin/users/create', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        const condos = await condoModel.find().lean();

        res.render('admin-user-create', {
            layout: 'index',
            title: 'Create User',
            isAdmin: true,
            username: req.session.username,
            condos: condos
        });
    });

    // CREATE USER POST
    server.post('/admin/users/create', [
        requireAuth,
        validateTextLength('pass', 8, 64),
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const { user, pass, email, city, role, assignedCondo } = req.body;
            bcrypt = require('bcrypt');

            // Validate password complexity
            function isComplex(pwd) {
              const hasUpper  = /[A-Z]/.test(pwd);
              const hasLower  = /[a-z]/.test(pwd);
              const hasDigit  = /[0-9]/.test(pwd);
              const hasSpecial= /[^A-Za-z0-9]/.test(pwd);
              return hasUpper && hasLower && hasDigit && hasSpecial;
            }
            if (!isComplex(pass)) {
                return res.status(400).send("Password must include uppercase, lowercase, digit, and special character.");
            }

            const newUser = new userModel({
                user,
                pass: await bcrypt.hash(pass, 10),
                email,
                picture: "images/gamer.png",
                city,
                role
            });

            await newUser.save();

            // If owner → update the condo to assign them
            if (role === "owner" && assignedCondo) {
                await condoModel.findOneAndUpdate(
                    { id: assignedCondo },
                    { owner: newUser._id }
                );
            }

            res.redirect('/admin/dashboard');
        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to create user.");
        }
    });


    // EDIT USER PAGE
    server.get('/admin/users/:id/edit', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const user = await userModel.findById(req.params.id).lean();

            if (!user) return res.status(404).send("User not found.");

            res.render('admin-user-edit', {
                layout: 'index',
                title: 'Edit User',
                isAdmin: true,
                username: req.session.username,
                user
            });

        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to load user.");
        }
    });


    // EDIT USER POST
    server.post('/admin/users/:id/edit', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const updates = {
                user: req.body.user,
                email: req.body.email,
                role: req.body.role,
                city: req.body.city
            };

            await userModel.findByIdAndUpdate(req.params.id, updates);

            res.redirect('/admin/dashboard');
        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to update user.");
        }
    });


    // CHANGE PASSWORD PAGE
    server.get('/admin/users/:id/password', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const user = await userModel.findById(req.params.id).lean();
            if (!user) return res.status(404).send("User not found");

            res.render('admin-user-password', {
                layout: 'index',
                title: 'Change Password',
                isAdmin: true,
                username: req.session.username,
                user
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to load password page.");
        }
    });

    // CHANGE PASSWORD POST
    server.post('/admin/users/:id/password', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const { newPassword, confirmPassword } = req.body;

            if (!newPassword || !confirmPassword)
                res.status(400).send("Missing fields.");

            if (newPassword !== confirmPassword)
                res.status(400).send("Passwords do not match.");
            else {
                await changePassword(req.params.id, newPassword).then(() => {
                    console.log("Password changed successfully.");
                    res.redirect('/admin/dashboard');
                }).catch(err => {
                    console.log(err);
                    res.status(400).send(err.message);
                    return;
                });  
            }

        } catch (err) {
            console.error(err);
            res.status(500).send("Failed to update password.");
        }
    });


    // DELETE USER
    server.post('/admin/users/delete', [
        requireAuth,
        requireRole(ROLES.ADMIN)
    ], async (req, res) => {
        try {
            const result = await userModel.deleteOne({ _id: req.body.userId });

            res.json({ deleted: result.deletedCount > 0 });

        } catch (err) {
            console.error(err);
            res.json({ deleted: false });
        }
    });
}

module.exports.add = add;