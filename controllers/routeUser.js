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
        validateUsername(),  // Only alphanumeric, underscore, hyphen
        validateTextLength('password', 8, 128),  // Password length
        validateTextLength('picture', 0, 500),   // Optional picture URL
        validateTextLength('bio', 0, 500)        // Optional bio
    ], async (req, resp) => {
        let createSuccess, createStatus, createMessage;

        // Get role from request, default to customer
        const role = req.body.role || ROLES.CUSTOMER;

        // Call your existing createAccount function with role
        [createSuccess, createStatus, createMessage] = await userFunctions.createAccount(
            req.body.username, 
            req.body.password, 
            req.body.picture, 
            req.body.bio,
            role
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
        validateTextLength('user', 3, 50),      // Username length
        validateTextLength('bio', 0, 500),      // Bio length (optional)
        validateTextLength('picture', 0, 500),  // Picture URL (optional)
        validateEmail('email'),                 // Email format (optional)
        validateTextLength('education', 0, 200), // Education (optional)
        validateTextLength('city', 0, 100)      // City (optional)
    ], async (req, resp) => {
        const newData = userFunctions.filterEditData(req.body);

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
