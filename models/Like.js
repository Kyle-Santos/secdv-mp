const mongoose = require('mongoose');

// Define schema for likes
const likeSchema = new mongoose.Schema({
    reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    isLike: Boolean, // 'like' or 'dislike'
    createdAt: {
        type: Date,
        default: Date.now
    }
});


// Create the Like model
const likeModel = mongoose.model('like', likeSchema);

module.exports = likeModel;