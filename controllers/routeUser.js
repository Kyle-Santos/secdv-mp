const userModel = require('../models/User');
const condoModel = require('../models/Condo');
const reviewModel = require('../models/Review');
const userFunctions = require('../models/userFunctions');

function add(server){
    server.get('/loggedInStatus', function(req, resp){
        // Check if user is authenticated by verifying the presence of user details in session
        if (req.session && req.session.isAuthenticated) {
            resp.send({
                isAuthenticated: req.session.isAuthenticated,
                username: req.session.username,
                picture: req.session.picture,
                role: req.session.role
            });
        } else {
            resp.send({
                isAuthenticated: false // Set isAuthenticated to false
            });
        }
    });

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
    
    // create account POST
    server.post('/create-account', async (req, resp) => {
        let createSuccess, createStatus, createMessage;

       [createSuccess, createStatus, createMessage] = await userFunctions.createAccount(req.body.username, req.body.password, req.body.picture, req.body.bio);

        resp.status(createStatus).send({success: createSuccess, message: createMessage});
    });

    // Logout POST
    server.post('/logout', function(req, resp){
        req.session.destroy(function(err) {
            resp.send({});
        });
    });

    // Login POST 
    server.post('/login', async (req, res) => {
        const { username, password, rememberMe } = req.body;   

        let findStatus, findMessage;

        [findStatus, findMessage, user] = await userFunctions.findUser(username, password);
        
        if (findStatus === 200) {
            if (rememberMe === 'true') 
                req.session.cookie.expires = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000); // 21 days 

            req.session.username = user.user;
            req.session.picture = user.picture;
            req.session.role = user.role;
            req.session.isAuthenticated = true;
            req.session._id = user._id;
        }

        res.status(findStatus).json({message: findMessage, picture: user.picture});
    });


    // get profile GET
    server.get('/profile/:username', async (req, resp) => {
        const username = req.params.username; // Retrieve the username from the URL
        var processedReviews;

        try {
            // Query MongoDB to get data
            var data = await userModel.findOne({ user: username }).populate('reviews').lean();

            processedReviews = data.reviews ? await userFunctions.processReviews(data.reviews, req.session._id) : [];

            const reviews = await reviewModel.find().populate('comments.user').lean();

            const commentsByUser = [];
    
            // Iterate over the comments array
            reviews.forEach(review => {
                review.comments.forEach(comment => {
                    // Access the comment author's user information
                    const commentUser = comment.user.user;
    
                    // Check if the comment author is the user we're interested in
                    if (commentUser && commentUser === username) {
                        // Format date without time component
                        comment.date = comment.date.toLocaleDateString(); // Assuming date is a JavaScript Date object
                        // Append the comment to the list
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
            // Handle errors
            console.error('Error fetching data from MongoDB', err);
            resp.status(500).json({ error: 'Failed to fetch data' });
        }
    });

    // get edit profile GET
    server.get('/edit-profile/', function(req, resp) {
        resp.render('editprofile',{
            layout: 'index',
            title: 'Edit Profile',
            isEditProfile: true
        });
    });

    server.patch('/edit-profile-submit', async (req, resp) => {
        const newData = userFunctions.filterEditData(req.body);

        // Use updateOne to update specific fields of the user document
        userModel.updateOne({ "user": req.session.username }, { $set: newData })
            .then(result => {
                // Handle successful update
                console.log("Update successful:", result);

                if (newData.user !== undefined) req.session.username = newData.user;
                if (newData.picture !== undefined) req.session.picture = newData.picture.replace('public/', '');

                resp.json({message: 'Profile updated successfully!', user: req.session.username });
            })
            .catch(err => {
                // Handle error
                console.error("Error updating document:", err);
                resp.json({message: 'Error. That username is already taken.', user: req.session.username });
                return false;
            });

    });

}

module.exports.add = add;