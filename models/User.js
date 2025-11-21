const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user: { 
        type: String,
        required: true,
        unique: true // Ensure usernames are unique
    },
    pass: { 
        type: String,
        required: true
    },
    picture: {type: String},
    bio: {type: String},
    email: {type: String},
    role: {type: String},
    education: {type: String},
    city: {type: String},
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review' // Reference to the Review model for the reviews authored by the user
    }]
},{ versionKey: false, timestamps: true });

// Create the User model
const userModel = mongoose.model('user', userSchema);

module.exports = userModel;