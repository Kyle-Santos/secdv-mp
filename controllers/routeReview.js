const userModel = require('../models/User');
const condoModel = require('../models/Condo');
const reviewModel = require('../models/Review');
const likeModel = require('../models/Like');
const userFunctions = require('../models/userFunctions');
const { ObjectId } = require('mongodb');

// saving uploaded image
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Define storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/client-uploaded-files'); // Set destination folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use original filename
    }
});

const upload = multer({ storage: storage }); // Store uploaded files in the 'uploads' directory

const { requireAuth, checkOwnership, ROLES } = require('../middleware/auth');
const { logAccessControlFailure, logError, writeToLog } = require('../middleware/error');

function add(server){
    server.post('/delete-review', 
        requireAuth, 
        checkOwnership(async (req) => {
            const review = await reviewModel.findById(req.body.reviewId);
            if (!review) throw new Error('Review not found');   

            const condo = await condoModel.findOne({ id: req.body.condoId });
            if (!condo) throw new Error('Condo not found');

            // Return both IDs for ownership check
            return { reviewAuthor: review.author, condoOwner: condo.owner };
        }), 
        async (req, res) => {
            try {
                const { condoId, reviewId } = req.body;
                const currentUserId = req.session._id;
                const currentUsername = req.session.username || 'Unknown';

                const review = await reviewModel.findById(reviewId);
                if (!review) {
                    logAccessControlFailure(currentUsername, `Review:${reviewId}`, 'delete', 'Review not found', req.ip);
                    return res.status(404).json({ deleted: 0, msg: 'Review not found' });
                }

                const author = await userModel.findById(review.author);

                // Remove review from author's list
                author.reviews = author.reviews.filter(item => String(item) !== String(reviewId));
                await author.save();

                // Delete review and associated likes
                await likeModel.deleteMany({ reviewId });
                await reviewModel.deleteOne({ _id: reviewId });

                // Update condo average rating
                await userFunctions.updateAverageRating(condoId);

                // Log the deletion event
                const logMsg = `[${new Date().toISOString()}] REVIEW DELETED - ReviewID: ${reviewId}, CondoID: ${condoId}, DeletedBy: ${currentUsername} (UserID: ${currentUserId})`;
                writeToLog(logMsg);
                console.log(logMsg);

                res.send({ deleted: 1, msg: 'Review successfully deleted' });
            } catch (err) {
                logError(err, req);
                res.status(500).send({ deleted: 0, msg: 'Server error' });
            }
        }
    );

    server.post('/search-review', function(req, resp){
        var text = req.body.text;
        var condoId = req.body.condoId;
        var listOfReviews = new Array();

        var searchQuery = {condoId: condoId};

        reviewModel.find(searchQuery).populate('author comments.user').lean().then(async function(reviews){
            let content;
            let title;
            for(const item of reviews){
                content = item.content.toUpperCase();
                title = item.title.toUpperCase();

                if(content.includes(text) || title.includes(text)){
                    listOfReviews.push(item);
                }
            }

            reviews = await userFunctions.processReviews(listOfReviews, req.session._id);
            resp.send({reviews: reviews});
        });
    });

    server.patch('/create-review', async (req, resp) => {
        const { condoId, title, content, rating, image, date } = req.body;
    
        await userFunctions.createReview(condoId, title, content, rating, image, date, req.session.username);
        await userFunctions.updateAverageRating(condoId);
        resp.status(200).send({ success: true, message: 'Review published successfully', user: req.session.username, role: req.session.role, icon: req.session.picture });
    });

    // create comment POST
    server.post('/create-comment', async (req, resp) => {
        let createSuccess, createStatus, createMessage;

       [createSuccess, createStatus, createMessage] = await userFunctions.createComment(req.session._id, req.body.content, req.body.date, req.body.reviewId);

        resp.status(createStatus).send({ success: createSuccess, message: createMessage, user: req.session });
    });

    server.post('/upload-image', upload.single('image'), (req, res) => {
        // Get the temporary file path of the uploaded image
        const tempFilePath = req.file.path;
    
        if (fs.existsSync(tempFilePath)) {
            const destinationPath = path.join(__dirname, '..', 'public', 'images', 'client-uploaded-files', req.file.originalname);
            // Move the uploaded file to the destination path
            fs.rename(tempFilePath, destinationPath, err => {
                if (err) {
                    console.error('Error:', err);
                    res.status(500).send('Error saving image');
                } else {
                    console.log('Image saved successfully');
                    res.status(200).send('Image uploaded successfully');
                }
            });
        } else {
            return res.status(400).send('Uploaded file not found');
        }
    });

    server.get('/edit-review/:id', async (req, resp) => {
        try {
            const reviewId = req.params.id;
            const review = await reviewModel.findOne({ _id: reviewId }).lean();
            resp.send({ review: review }); 
        } catch(error) {
            resp.status(500).send('Error fetching review');
        }
    });

    server.patch('/update-review/:id', async (req, resp) => {
        try {
            const reviewId = req.params.id;
            const result = await reviewModel.findByIdAndUpdate(reviewId, req.body);
            await userFunctions.updateAverageRating(result.condoId);
            resp.status(200).send({username: req.session.username});
        } catch(error) {
            resp.status(500).send('Error updating review');
        }
    });


    server.patch('/update-comment/:id', async (req, resp) => {
        try {
            const commentId = req.params.id;
            const reviews = await reviewModel.find();
            const { content, date, isEdited } = req.body;

            // Loop through each review
            reviews.forEach(async review => {
                // Find the index of the comment with the given commentId
                const index = review.comments.findIndex(comment => comment._id == commentId);

                // If the comment is found (index is not -1), remove it
                if (index !== -1) {
                    review.comments[index].content = content;
                    review.comments[index].date = date;
                    review.comments[index].isEdited = isEdited;
                    await review.save();
                    resp.status(200).send({username: req.session.username});
                    return; 
                }
            });
        } catch(error) {
            resp.status(500).send('Error updating comment');
        }
    });

    server.post('/delete-comment', async (req, resp) => {
        try {
            const commentId = req.body.commentId;
            const reviews = await reviewModel.find();

            // Loop through each review
            reviews.forEach(async review => {
                // Find the index of the comment with the given commentId
                const index = review.comments.findIndex(comment => comment._id == commentId);
                // If the comment is found (index is not -1), remove it
                if (index !== -1) {
                    review.comments.splice(index, 1);
                    await review.save();
                    resp.send({deleted: 1});
                    return; 
                }
            });
        } catch (error) {
            console.error("Error deleting comment:", error);
            resp.status(500).send('Error deleting comment');
        }
    });



    server.post('/like', async (req, resp) => {
        var { reviewId, isClicked, isLike } = req.body;
        const userId = req.session._id;

        try {
            // Find the review by ID
            const review = await reviewModel.findById(reviewId);

            isLike = (isLike === "true");

            if (isClicked === "true") {
                await likeModel.findOneAndDelete({ userId: userId, reviewId: reviewId })

                isLike ? review.likes-- : review.dislikes--;
            }
            else {
                const like = likeModel ({
                    reviewId: reviewId,
                    userId: userId,
                    isLike: isLike
                });

                await like.save();

                isLike ? review.likes++ : review.dislikes++;
            }

            // Save the updated review
            await review.save();
    
            resp.status(200).send({ success: true, totalLikes: review.likes - review.dislikes});

        } catch (error) {
            console.error("Error creating liking:", error);
            throw error; // Throw the error for handling elsewhere
        }
    });
}

module.exports.add = add;