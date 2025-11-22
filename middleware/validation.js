// middleware/validationMiddleware.js
// Data validation middleware (Requirement 2.3)

const { logValidationFailure } = require('./error');

// Validate text length (Requirement 2.3.3)
function validateTextLength(field, minLength, maxLength) {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (value === undefined || value === null) {
            logValidationFailure(field, value, 'Field is required');
            // All validation failures should result in input rejection (Requirement 2.3.1)
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} is required` 
            });
        }

        const length = value.toString().length;
        
        if (length < minLength || length > maxLength) {
            logValidationFailure(field, value, `Length must be between ${minLength} and ${maxLength}`);
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} must be between ${minLength} and ${maxLength} characters` 
            });
        }

        next();
    };
}

// Validate numeric range (Requirement 2.3.2)
function validateNumericRange(field, min, max) {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (value === undefined || value === null) {
            logValidationFailure(field, value, 'Field is required');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} is required` 
            });
        }

        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            logValidationFailure(field, value, 'Must be a number');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} must be a valid number` 
            });
        }

        if (numValue < min || numValue > max) {
            logValidationFailure(field, value, `Must be between ${min} and ${max}`);
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} must be between ${min} and ${max}` 
            });
        }

        next();
    };
}

// Validate allowed characters (Requirement 2.3.2)
function validateAllowedCharacters(field, pattern, patternDescription) {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (value === undefined || value === null || value === '') {
            logValidationFailure(field, value, 'Field is required');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} is required` 
            });
        }

        const regex = new RegExp(pattern);
        
        if (!regex.test(value)) {
            logValidationFailure(field, value, `Contains invalid characters. ${patternDescription}`);
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `${field} contains invalid characters. ${patternDescription}` 
            });
        }

        next();
    };
}

// Validate email format
function validateEmail(field) {
    return (req, res, next) => {
        const value = req.body[field];
        
        if (!value || value === '') {
            // Email might be optional depending on your requirements
            return next();
        }

        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!emailPattern.test(value)) {
            logValidationFailure(field, value, 'Invalid email format');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Invalid email format' 
            });
        }

        next();
    };
}

// Validate rating (1-5)
function validateRating(field) {
    return validateNumericRange(field, 1, 5);
}

// Validate username format (alphanumeric, underscore, hyphen only)
function validateUsername() {
    return validateAllowedCharacters(
        'username', 
        '^[a-zA-Z0-9_-]+$',
        'Only letters, numbers, underscores, and hyphens are allowed'
    );
}

// Composite validation for review creation
function validateReview() {
    return [
        validateTextLength('title', 5, 100),
        validateTextLength('content', 10, 2000),
        validateRating('rating')
    ];
}

// Composite validation for comment creation
function validateComment() {
    return [
        validateTextLength('content', 1, 500)
    ];
}

// Validate condo ID format (for security)
function validateCondoId(field) {
    return (req, res, next) => {
        const value = req.body[field] || req.params[field];
        
        if (!value) {
            logValidationFailure(field, value, 'Condo ID is required');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Condo ID is required' 
            });
        }

        // Allow alphanumeric and hyphens for condo IDs
        const condoIdPattern = /^[a-zA-Z0-9-]+$/;
        
        if (!condoIdPattern.test(value)) {
            logValidationFailure(field, value, 'Invalid condo ID format');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Invalid condo ID format' 
            });
        }

        next();
    };
}

// Validate MongoDB ObjectId format
function validateObjectId(field) {
    return (req, res, next) => {
        const value = req.body[field] || req.params[field];
        
        if (!value) {
            logValidationFailure(field, value, 'ID is required');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'ID is required' 
            });
        }

        // MongoDB ObjectId is 24 character hex string
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        
        if (!objectIdPattern.test(value)) {
            logValidationFailure(field, value, 'Invalid ID format');
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Invalid ID format' 
            });
        }

        next();
    };
}

module.exports = {
    validateTextLength,
    validateNumericRange,
    validateAllowedCharacters,
    validateEmail,
    validateRating,
    validateUsername,
    validateReview,
    validateComment,
    validateCondoId,
    validateObjectId
};