const mongoose = require('mongoose');

// Define the schema for a condo
const condoSchema = new mongoose.Schema({
    id: { 
        type: String,
        required: true,
        unique: true // Ensure usernames are unique
    },
    name: { 
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0 // Default value for average rating
    },
    img: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',   // Reference to User model
        required: true
    }
},{ versionKey: false, timestamps: true });

// Create the Condo model
const condoModel = mongoose.model('condo', condoSchema);

module.exports = condoModel;