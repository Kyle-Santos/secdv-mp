// controllers/routeUser.js (or routeMain.js)
// Example of a fully updated route file with all security features

const userModel = require('../models/User');
const condoModel = require('../models/Condo');
const reviewModel = require('../models/Review');
const userFunctions = require('../models/userFunctions');
const bcrypt = require('bcrypt');                       // needed for token reset
const { changePassword, checkSecurityAnswers, isComplex } = require('../models/userFunctions');

// Import middleware
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { validateTextLength, validateEmail, validateUsername } = require('../middleware/validation');
const { logAuthAttempt, logAccessControlFailure, writeToLog } = require('../middleware/error');


function add(server){
    // Check login status - no auth required for this endpoint
    server.get('/loggedInStatus', function(req, resp){
        if (req.session && req.session.isAuthenticated) {
            resp.send({
                isAuthenticated: req.session.isAuthenticated,
                username: req.session.username,
                picture: req.session.picture,
                role: req.session.role
            });
        } else {
            resp.send({
                isAuthenticated: false
            });
        }
    });

    // Home page - PUBLIC (Requirement 2.1.1 - public pages don't need auth)
    server.get('/', function(req,resp){
        condoModel.find().lean().then(function(condos){
            for(const condo of condos) {
                condo.description = condo.description.slice(0, 150) + "...";
            }
            
            resp.render('home',{
                layout: 'index',
                title: 'Home Page',
                isHome: true,
                condos: condos
            });
        }).catch(function(err){
            console.error('Error fetching condos:', err);
            resp.status(500).send('Internal Server Error');
        }); 
    });
    
    // Create account - WITH VALIDATION (Requirements 2.3.x)
    server.post('/create-account', [
        validateUsername('username'),  // Only alphanumeric, underscore, hyphen
        validateTextLength('password', 8, 64),  // Password length
        validateTextLength('picture', 0, 500),   // Optional picture URL
        validateTextLength('bio', 0, 500),        // Optional bio
        validateTextLength('answers', 3, 50)   // each answer
    ], async (req, resp) => {
        let createSuccess, createStatus, createMessage;

        // Get role from request, default to customer
        const role = req.body.role || ROLES.REVIEWER;
        const questionBank = [
                    // --- q1 block ---
                    "What was the name of your first pet?",
                    "In what city did you meet your first significant other?",
                    "What is the last name of your childhood teacher?",
                    "What was the name of the street your childhood friend lived on?",
                    "What was the model of your first car?",
                    "What was the name of your first stuffed animal or toy?",
        
                    // --- q2 block ---
                    "What was the name of the town where your grandparents lived?",
                    "What is your oldest cousin's first name?",
                    "What is the name of a place you've always wanted to visit?",
                    "What is the name of the hospital where you were born?",
                    "What was the first city you visited?",
                    "What is the name of a restaurant you frequent?",
        
                    // --- q3 block ---
                    "What was the name of the first school you attended?",
                    "What was the name of the first concert you attended?",
                    "What is the name of the friend you've known the longest?",
                    "What is the name of a place you celebrated a special occasion at?",
                    "What was the name of your first roommate?",
                    "What was the first dish you've successfully made?"
                ];
                const questions = req.body.questions.map(i => questionBank[parseInt(i, 10)]);
                const answers   = req.body.answers;
                // Call your existing createAccount function with role
                [createSuccess, createStatus, createMessage] = await userFunctions.createAccount(
                    req.body.username, 
                    req.body.password, 
                    req.body.picture, 
                    req.body.bio,
                    role,
                    questions,
                    answers
                );

        // Log authentication attempt (Requirement 2.4.5)
        const ipAddress = req.ip || req.connection.remoteAddress;
        if (createSuccess) {
            logAuthAttempt(req.body.username, true, 'Account created', ipAddress);
        } else {
            logAuthAttempt(req.body.username, false, createMessage, ipAddress);
        }

        resp.status(createStatus).send({
            success: createSuccess, 
            message: createMessage
        });
    });

    // Login - Log all attempts (Requirement 2.4.5)
    server.post('/login', async (req, res) => {
        const { username, password, rememberMe } = req.body;   
        const ipAddress = req.ip || req.connection.remoteAddress;

        let findStatus, findMessage, user;

        [findStatus, findMessage, user] = await userFunctions.findUser(username, password);
        
        if (findStatus === 200) {
            // Set session
            let lastInfo = '';
            if (user.lastLoginAt) {
                lastInfo = `Last login: ${user.lastLoginAt.toLocaleString()}`;
                if (user.lastLoginIp) lastInfo += ` from ${user.lastLoginIp}`;
            }
            if (rememberMe === 'true') {
                req.session.cookie.expires = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000); // 21 days 
            }

            req.session.username = user.user;
            req.session.picture = user.picture;
            req.session.role = user.role || ROLES.REVIEWER;
            req.session.isAuthenticated = true;
            req.session._id = user._id;

            // Log successful login (Requirement 2.4.5)
            logAuthAttempt(username, true, 'Login successful', ipAddress);
            user.lastLoginAt    = new Date();
            await user.save();
            res.status(findStatus).json({
                message: `${findMessage} ${lastInfo}`, 
                picture: user.picture,
                role: user.role
            });
        } else {
            // Log failed login (Requirement 2.4.5)
            logAuthAttempt(username, false, findMessage, ipAddress);
            user.lastLoginAt    = new Date();
            await user.save();
            res.status(findStatus).json({
                message: findMessage
            });
        }
    });

    // Logout - Requires authentication
    server.post('/logout', requireAuth, function(req, resp){
        const username = req.session.username;
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        req.session.destroy(function(err) {
            if (!err) {
                logAuthAttempt(username, true, 'User logged out', ipAddress);
            }
            resp.send({});
        });
    });

    // View profile - Requires authentication (Requirement 2.1.1)
    server.get('/profile/:username', requireAuth, async (req, resp) => {
        const username = req.params.username;
        var processedReviews;

        try {
            var data = await userModel.findOne({ user: username }).populate('reviews').lean();

            if (!data) {
                return resp.status(404).render('error', {
                    layout: 'index',
                    title: 'Not Found',
                    message: 'User not found'
                });
            }

            processedReviews = data.reviews ? await userFunctions.processReviews(data.reviews, req.session._id) : [];

            const reviews = await reviewModel.find().populate('comments.user').lean();
            const commentsByUser = [];
    
            reviews.forEach(review => {
                review.comments.forEach(comment => {
                    const commentUser = comment.user.user;
    
                    if (commentUser && commentUser === username) {
                        comment.date = comment.date.toLocaleDateString();
                        commentsByUser.push(comment);
                    }
                });
            });

            resp.render('viewprofile', {
                layout: 'index',
                title: data.user,
                'data': data,
                'reviews': processedReviews.reverse(),
                'comments': commentsByUser,
                isProfile: true
            });
        } catch (err) {
            console.error('Error fetching data from MongoDB', err);
            resp.status(500).json({ error: 'Failed to fetch data' });
        }
    });

    // Edit profile page - Requires authentication
    server.get('/edit-profile/', requireAuth, function(req, resp) {
        resp.render('editprofile',{
            layout: 'index',
            title: 'Edit Profile',
            isEditProfile: true
        });
    });

    // Get security questions for a user
    server.get('/get-security-questions', async (req, resp) => {
        const username = req.query.username;
        
        if (!username) {
            return resp.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        try {
            const user = await userModel.findOne({ user: username });
            if (!user) {
                return resp.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!user.securityQuestions || user.securityQuestions.length === 0) {
                return resp.status(400).json({
                    success: false,
                    message: 'No security questions set for this user'
                });
            }

            resp.json({
                success: true,
                questions: user.securityQuestions
            });
        } catch (error) {
            console.error('Error fetching security questions:', error);
            resp.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    });

    // Forgot password reset endpoint
    server.post('/forgot-password', [
        validateTextLength('newPassword', 8, 64)
    ], async (req, resp) => {
        const { username, newPassword, confirmNewPassword, answers } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Basic validation
        if (!username || !newPassword || !confirmNewPassword || !answers) {
            return resp.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmNewPassword) {
            return resp.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (!isComplex(newPassword)) {
            return resp.status(400).json({
                success: false,
                message: 'Password must contain upper-case, lower-case, number and special character.'
            });
        }

        try {
            // Find user
            const user = await userModel.findOne({ user: username });
            if (!user) {
                logAuthAttempt(username, false, 'Password reset attempt for non-existent user', ipAddress);
                return resp.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check security answers
            const answersCorrect = await checkSecurityAnswers(user._id, answers);
            if (!answersCorrect) {
                logAuthAttempt(username, false, 'Incorrect security answers for password reset', ipAddress);
                return resp.status(401).json({
                    success: false,
                    message: 'Incorrect security answers'
                });
            }

            // Change password
            await changePassword(user._id, newPassword);
            
            logAuthAttempt(username, true, 'Password reset successful', ipAddress);
            
            resp.json({
                success: true,
                message: 'Password reset successfully'
            });
        } catch (error) {
            console.error('Error during password reset:', error);
            logAuthAttempt(username, false, `Password reset error: ${error.message}`, ipAddress);
            
            resp.status(400).json({
                success: false,
                message: error.message
            });
        }
    });

    // Submit profile edit - Requires authentication + validation (Requirements 2.3.x)
    server.patch('/edit-profile-submit', [
        requireAuth,
    ], async (req, resp) => {
        const newData = req.body;
        
        if (newData.user !== undefined) {
            validateUsername('user')(req, resp, () => {});
            if (resp.headersSent) return; // STOP if validator already responded
        }
        
        currentPass = newData.currentPass;
        if (currentPass) {
            console.log("Verifying current password for user:", req.session.username);

            // get session._id to query for pass hash and use for comparing
            const userId = req.session._id;
            const user = await userModel.findById(userId).lean();
            const passwordHash = user ? user.pass : null;

            // Verify current password
            const passwordMatch = await bcrypt.compare(currentPass, passwordHash);
            if (!passwordMatch) {
                return resp.json({
                    message: 'Current password is incorrect.', 
                    user: req.session.username 
                });
            }

            if (newData.pass !== undefined) {
                validateTextLength('pass', 8, 64)(req, resp, () => {});
                if (resp.headersSent) return; // STOP if validator already responded
            }

            // Change to new password
            message = "";
            await changePassword(userId, newData.pass).then(() => {
                message = "Password changed successfully for user: " + req.session.username;
                console.log("Password changed successfully for user:", req.session.username);
            }).catch(err => {
                message = err.message;
                console.error("Error changing password for user:", req.session.username, err);
            });  
            
            // remove currentPass and pass from newData to avoid updating it
            delete newData.currentPass;
            delete newData.pass;

            if (Object.keys(newData).length === 0) {
                return resp.json({
                    message: message, 
                    user: req.session.username 
                });
            }
        }

        userModel.updateOne({ "user": req.session.username }, { $set: newData })
            .then(result => {
                console.log("Update successful:", result);

                // Update session if username or picture changed
                if (newData.user !== undefined) req.session.username = newData.user;
                if (newData.picture !== undefined) req.session.picture = newData.picture.replace('public/', '');

                resp.json({
                    message: 'Profile updated successfully!', 
                    user: req.session.username 
                });
            })
            .catch(err => {
                console.error("Error updating document:", err);
                resp.status(400).json({
                    message: 'Error. That username is already taken.', 
                    user: req.session.username 
                });
            });
    });
}

module.exports.add = add;
