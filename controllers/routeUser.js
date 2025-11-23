// controllers/routeUser.js (or routeMain.js)
// Example of a fully updated route file with all security features

const userModel = require('../models/User');
const condoModel = require('../models/Condo');
const reviewModel = require('../models/Review');
const userFunctions = require('../models/userFunctions');
const bcrypt = require('bcrypt');                       // needed for token reset
const { changePassword, checkSecurityAnswers } = require('../models/userFunctions');

// Import middleware
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { validateTextLength, validateEmail, validateUsername } = require('../middleware/validation');
const { logAuthAttempt, logAccessControlFailure } = require('../middleware/error');

function isComplex(pwd) {
    const hasUpper  = /[A-Z]/.test(pwd);
    const hasLower  = /[a-z]/.test(pwd);
    const hasDigit  = /[0-9]/.test(pwd);
    const hasSpecial= /[^A-Za-z0-9]/.test(pwd);
    return hasUpper && hasLower && hasDigit && hasSpecial;
}

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
        validateTextLength('password', 8, 128),  // Password length
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

            res.status(findStatus).json({
                message: `${findMessage} ${lastInfo}`, 
                picture: user.picture,
                role: user.role
            });
        } else {
            // Log failed login (Requirement 2.4.5)
            logAuthAttempt(username, false, findMessage, ipAddress);
            
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

    // Submit profile edit - Requires authentication + validation (Requirements 2.3.x)
    server.patch('/edit-profile-submit', [
        requireAuth,
    ], async (req, resp) => {
        const newData = req.body;
        
        if (newData.user !== undefined) {
            await new Promise((resolve, reject) => {
                validateUsername('user')(req, resp, (err) => {
                    if (resp.headersSent) return; // stop execution if validator already responded
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        // password validation
        if (newData.pass !== undefined) {
            await new Promise((resolve, reject) => {
                validateTextLength('pass', 8, 128)(req, resp, (err) => {
                    if (resp.headersSent) return;
                    if (err) reject(err);
                    else resolve();
                });
            });

            let encryptedPass = "";
        
        
            if (!isComplex(newData.pass))
                return [false, 400, 'Password must contain upper-case, lower-case, number and special character.'];
        
            await new Promise((resolve, reject) => {
                bcrypt.hash(newData.pass, 10, function(err, hash) { 
                    encryptedPass = hash;
                    resolve(); // Resolve the promise when hashing is complete
                });
            });
            
            // User123$
            newData.pass = encryptedPass;   
        }

            
        console.log("Updating user with data:", newData);
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
