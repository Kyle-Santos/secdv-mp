const userModel = require('../models/User');
const reviewModel = require('../models/Review');
const likeModel = require('../models/Like');
const condoModel = require('../models/Condo');

// can be added to hash the password for confidentiality
const bcrypt = require('bcrypt'); 
const { writeToLog } = require('../middleware/error');
const saltRounds = 10;

function isComplex(pwd) {
  const hasUpper  = /[A-Z]/.test(pwd);
  const hasLower  = /[a-z]/.test(pwd);
  const hasDigit  = /[0-9]/.test(pwd);
  const hasSpecial= /[^A-Za-z0-9]/.test(pwd);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

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
            return [401, 'Invalid username and/or password', 0, "", "", "reviewer"];
        }

        if (user.lockoutUntil && user.lockoutUntil > Date.now())
            return [423, 'Account locked – too many failed attempts.', user];

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.pass);

        if (!passwordMatch) {
            // record failure
            user.failedAttempts = (user.failedAttempts || 0) + 1;
            if (user.failedAttempts >= 5){
            user.lockoutUntil = new Date(Date.now() + 15*60*1000); // 15-min lock
            }
            await user.save();
            return [401, 'Invalid username and/or password', user];
        }

        user.failedAttempts = 0;
        user.lockoutUntil   = undefined;
        user.lastLoginAt    = new Date();
        user.lastLoginIp    = (arguments[2] /* ip injected by route */ || '');
        await user.save();
        // Authentication successful
        return [200, 'Login successful', user];
        //res.status(200).json({ message: 'Login successful', user: user });
    } catch (error) {
        console.error('Error during login:', error);
        return [500, 'Internal Server Error', null];
        //res.status(500).json({ message: 'Internal server error' });
    }
}

async function createAccount(username, password, picture, bio, role, questions, answers) {
    // encrypt password
    let encryptedPass = "";


    if (!isComplex(password))
        return [false, 400, 'Password must contain upper-case, lower-case, number and special character.'];

    await new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function(err, hash) { 
            encryptedPass = hash;
            resolve(); // Resolve the promise when hashing is complete
        });
    });

    const answerHashes = await Promise.all(
        answers.map(a => bcrypt.hash(a, saltRounds))
    );

    const user = userModel({
        user: username,
        pass: encryptedPass,
        picture: picture,
        email: "none",
        role: "reviewer",
        school: "not specified",
        city: "not specified",
        bio: bio,
        securityQuestions: questions, // plain questions
        securityAnswers: answerHashes // hashed answers
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

// ---------- 3.  HISTORY + MIN-AGE ----------
async function changePassword(userId, newPlain){
  const user = await userModel.findById(userId);
  if (!user) throw new Error('User not found');

  const oneDayAgo = new Date(Date.now() - 24*60*60*1000);
  if (user.passwordChangedAt && user.passwordChangedAt > oneDayAgo) {
        writeToLog(`[${new Date().toISOString()}] PASSWORD CHANGE ATTEMPT - User: ${user.user} attempted to change password within 24 hours.`);
        throw new Error('Password can only be changed once per 24 h.');
  }

  // prevent reuse
  for (const oldHash of (user.passwordHistory||[])){
    if (await bcrypt.compare(newPlain, oldHash)) {
        writeToLog(`[${new Date().toISOString()}] PASSWORD CHANGE ATTEMPT - User: ${user.user} attempted to reuse an old password.`);
        throw new Error('You have used that password recently.');
    }
  }

  if (!isComplex(newPlain)) {
    writeToLog(`[${new Date().toISOString()}] PASSWORD CHANGE ATTEMPT - User: ${user.user} attempted to change password with a non-complex password.`);
    throw new Error('Password does not meet complexity rules.');
  }

  // push current hash into history (keep last 5)
  user.passwordHistory = [user.pass, ...(user.passwordHistory||[])].slice(0,5);
  user.pass            = await bcrypt.hash(newPlain, saltRounds);
  user.passwordChangedAt = new Date();
  await user.save();

  writeToLog(`[${new Date().toISOString()}] PASSWORD CHANGE - User: ${user.user} changed their password successfully.`);
  return true;
}

// ---------- 4.  RESET WITH SECURITY QUESTIONS ----------
// we store the answers hashed exactly like passwords
async function checkSecurityAnswers(userId, answers /* array of strings */){
  const user = await userModel.findById(userId).select('securityAnswers');
  if (!user || !user.securityAnswers || user.securityAnswers.length !== answers.length)
    return false;

  for (let i=0;i<answers.length;i++){
    if (!await bcrypt.compare(answers[i], user.securityAnswers[i]))
      return false;
  }
  return true;
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
    const { user, email, bio, education, city, picture, pass } = userData;
    // Filter out null values
    const newData = {};
    if (user !== undefined && user !== "") newData.user = user;
    if (email !== undefined) newData.email = email;
    if (bio !== undefined) newData.bio = bio;
    if (education !== undefined) newData.education = education;
    if (city !== undefined) newData.city = city;
    if (picture !== null && picture !== undefined && picture !== "") newData.picture = picture;
    if (pass !== undefined && pass !== "") newData.pass = pass;

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

module.exports.isComplex = isComplex; 
module.exports.processReviews = processReviews;
module.exports.findUser = findUser;
module.exports.createAccount = createAccount;
module.exports.changePassword         = changePassword;
module.exports.checkSecurityAnswers   = checkSecurityAnswers;
module.exports.filterEditData = filterEditData;
module.exports.createReview = createReview;
module.exports.createComment = createComment;
module.exports.updateAverageRating = updateAverageRating;
