const userModel = require('../models/User');
const reviewModel = require('../models/Review');
const likeModel = require('../models/Like');
const condoModel = require('../models/Condo');

// can be added to hash the password for confidentiality
const bcrypt = require('bcrypt'); 
const saltRounds = 10;

async function updateAverageRating(condoId){
    let total = 0;
    let averageRating;
    console.log('condoId: ' + condoId);
    reviewModel.find({condoId: condoId}).then(function(condos){
        if(condos.length !== 0){
            console.log('defined');
            console.log('length of reviews: ' + condos.length);
            for(const item of condos){
                total += item.rating;
                console.log('Total: ' + total);
            }

            averageRating = parseFloat(total/condos.length).toFixed(1);
            console.log('Average rating: ' + averageRating);
            console.log('Type of average: ' + typeof averageRating);          
        } else {
            console.log('no reviews found');
            averageRating = 0;
        } 

        condoModel.findOne({id: condoId}).then(function(condo){
            condo.rating = averageRating;
            condo.save();
        });  

    });
}

async function findUser(username, password){
    
    try {
        // Find user by username
        
        const user = await userModel.findOne({ user: username });
        if (!user) {
            return [404, 'User not found', 0, "", "", "Condo Bro"];
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.pass);

        if (!passwordMatch) {
            return [401, 'Invalid password', user];
        }

        // Authentication successful
        return [200, 'Login successful', user];
        //res.status(200).json({ message: 'Login successful', user: user });
    } catch (error) {
        console.error('Error during login:', error);
        return [500, 'Internal Server Error', null];
        //res.status(500).json({ message: 'Internal server error' });
    }
}

async function createAccount(username, password, picture, bio) {
    // encrypt password
    let encryptedPass = "";

    await new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function(err, hash) { 
            encryptedPass = hash;
            resolve(); // Resolve the promise when hashing is complete
        });
    });

    const user = userModel({
        user: username,
        pass: encryptedPass,
        picture: picture,
        email: "none",
        role: "Condo Bro",
        school: "not specified",
        city: "not specified,",
        bio: bio
        });
        
        return user.save().then(function(login) {
            console.log('Account created');

            return [true, 200, 'Account created successfully'];
           // resp.status(200).send({ success: true, message: 'Account created successfully' });
        }).catch(function(error) {
            // Check if the error indicates a duplicate key violation
            if (error.code === 11000 && error.name === 'MongoServerError') {
                console.error('Duplicate key error:', error.keyPattern);
                // Handle duplicate key error
                return [false, 500, 'Username already exists. Error creating account.'];
                //resp.status(500).send({ success: false, message: 'Username already exists. Error creating account.' });
                
            } else {
                console.error('Error creating account:', error);

                return [false, 500, 'Error creating account'];
                //resp.status(500).send({ success: false, message: 'Error creating account' });
            }
        });
}

async function createComment(userId, content, date, reviewId) {
    try {
        // Find the review by ID
        const review = await reviewModel.findById(reviewId);
        // Add the new comment at the beginning of the comments array
        review.comments.unshift({ content, date, user: userId });

        // Save the updated review
        await review.save();

        return [true, 200, 'Comment was published!'];
    } catch (error) {
        console.error("Error creating comment:", error);
        throw error; // Throw the error for handling elsewhere
    }
}

function filterEditData(userData){
    const { name, email, bio, education, city, imagePath } = userData;
    // Filter out null values
    const newData = {};
    if (name !== undefined) newData.user = name;
    if (email !== undefined) newData.email = email;
    if (bio !== undefined) newData.bio = bio;
    if (education !== undefined) newData.education = education;
    if (city !== undefined) newData.city = city;
    if (imagePath !== null && imagePath !== undefined) newData.picture = imagePath;

    return newData;
}

async function createReview(condoId, title, content, rating, image, date, logUsername){
    // Find the user by username
    const user = await userModel.findOne( {user: logUsername} );

    // Create a review
    const newReview = reviewModel({
        title: title,
        content: content,
        rating: rating,
        image: image,
        date: date,
        condoId: condoId,
        likes: 0,
        dislikes: 0,
        author: user._id // Set the author field to the ObjectId of the user
    });
    
    // Save the new review instance to the database
    const savedReview = await newReview.save();

    // If needed, you can access the _id of the saved review document
    const savedReviewId = savedReview._id;

    // Update the user's reviews array
    user.reviews.push(savedReviewId);

    // Save the user to the database
    await user.save();
}

async function processReviews(reviews, userId){
    if (reviews) {
        // Preprocess date field
        processedReviews = await Promise.all(reviews.map(async review => {
            // Create a new object to avoid mutating the original object
            const processedReview = { ...review };

            // Format date without time component
            processedReview.date = review.date.toLocaleDateString(); // Assuming date is a JavaScript Date object

            // Format dates of comments
            processedReview.comments = review.comments.map(comment => {
                const processedComment = { ...comment };
                processedComment.date = comment.date.toLocaleDateString();
                return processedComment;
            });

            // Transform the integer rating into an array of boolean values representing filled stars
            processedReview.rating = Array.from({ length: 5 }, (_, index) => index < review.rating);

            processedReview.totalLikes = processedReview.likes - processedReview.dislikes;

            const like = await likeModel.findOne({ reviewId: review._id, userId: userId }).lean();
            
            if (like) 
                processedReview.userLike = like;

            return processedReview;
        }));

        return processedReviews;
    }

    return reviews;
}

module.exports.processReviews = processReviews;
module.exports.findUser = findUser;
module.exports.createAccount = createAccount;
module.exports.filterEditData = filterEditData;
module.exports.createReview = createReview;
module.exports.createComment = createComment;
module.exports.updateAverageRating = updateAverageRating;