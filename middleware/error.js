// middleware/errorMiddleware.js
// Error handling and logging (Requirement 2.4)

const fs = require('fs');
const path = require('path');

// Log file path
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Helper function to write to log file
function writeToLog(message) {
    fs.appendFile(LOG_FILE, message + '\n', (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
}

// Log authentication attempts (Requirement 2.4.5)
function logAuthAttempt(username, success, reason = '', ipAddress = '') {
    const timestamp = new Date().toISOString();
    const status = success ? 'SUCCESS' : 'FAILURE';
    const logMessage = `[${timestamp}] AUTH ${status} - Username: ${username}, IP: ${ipAddress}, Reason: ${reason}`;
    
    writeToLog(logMessage);
    console.log(logMessage);
}

// Log access control failures (Requirement 2.4.6)
function logAccessControlFailure(username, resource, action, reason = '', ipAddress = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ACCESS CONTROL FAILURE - Username: ${username}, IP: ${ipAddress}, Resource: ${resource}, Action: ${action}, Reason: ${reason}`;
    
    writeToLog(logMessage);
    console.log(logMessage);
}

// Log general errors
function logError(error, req = null) {
    const timestamp = new Date().toISOString();
    const ipAddress = req ? (req.ip || req.connection.remoteAddress) : 'N/A';
    const url = req ? req.url : 'N/A';
    const method = req ? req.method : 'N/A';
    const logMessage = `[${timestamp}] ERROR - IP: ${ipAddress}, Method: ${method}, URL: ${url}, Error: ${error.message}\nStack: ${error.stack}`;
    
    writeToLog(logMessage);
    console.error(logMessage);
}

// Generic error handler (Requirements 2.4.1 and 2.4.2)
// This must be added AFTER all routes in app.js
function errorHandler(err, req, res, next) {
    // Log the full error details internally
    logError(err, req);

    // Do not display debugging or stack trace information (Requirement 2.4.1)
    // Implement generic error messages (Requirement 2.4.2)
    
    // Determine status code
    const statusCode = err.statusCode || err.status || 500;
    
    // Generic error messages based on status code
    let message;
    switch (statusCode) {
        case 400:
            message = 'Bad request. Please check your input and try again.';
            break;
        case 401:
            message = 'Authentication required. Please log in to continue.';
            break;
        case 403:
            message = 'Access denied. You do not have permission to perform this action.';
            break;
        case 404:
            message = 'The requested resource was not found.';
            break;
        case 413:
            message = 'Request entity too large. Please reduce the size of your upload.';
            break;
        case 429:
            message = 'Too many requests. Please try again later.';
            break;
        case 500:
        default:
            message = 'An unexpected error occurred. Please try again later.';
            break;
    }
    
    // Send generic error response (no stack traces)
    res.status(statusCode).json({
        error: 'Error',
        message: message
    });
}

// 404 handler - for routes that don't exist
function notFoundHandler(req, res, next) {
    const timestamp = new Date().toISOString();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const logMessage = `[${timestamp}] 404 NOT FOUND - IP: ${ipAddress}, Method: ${req.method}, URL: ${req.url}`;
    
    writeToLog(logMessage);
    console.log(logMessage);
    
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found.'
    });
}

// Read all logs (restricted to admins only - Requirement 2.4.3)
function getLogs(req, res) {
    // This should be called only after auth middleware checks admin role
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Log file doesn't exist yet
                return res.status(200).type('text/plain').send('No logs available yet.');
            }
            console.error('Error reading log file:', err);
            return res.status(500).json({
                error: 'Error',
                message: 'Unable to retrieve logs'
            });
        }
        
        // Return logs as plain text
        res.type('text/plain').send(data || 'No logs available.');
    });
}

// Get recent logs (last N lines) - returns JSON format
function getRecentLogs(req, res) {
    const lines = parseInt(req.query.lines) || 100; // Default to last 100 lines
    
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(200).json({ logs: [] });
            }
            console.error('Error reading log file:', err);
            return res.status(500).json({
                error: 'Error',
                message: 'Unable to retrieve logs'
            });
        }
        
        const logLines = data.split('\n').filter(line => line.trim() !== '');
        const recentLogs = logLines.slice(-lines);
        
        res.json({ logs: recentLogs });
    });
}

// Clear logs (restricted to admins only)
function clearLogs(req, res) {
    const timestamp = new Date().toISOString();
    const clearedBy = req.session.username || 'Unknown';
    const archiveMessage = `[${timestamp}] ===== LOGS CLEARED BY: ${clearedBy} =====`;
    
    fs.writeFile(LOG_FILE, archiveMessage + '\n', (err) => {
        if (err) {
            console.error('Error clearing log file:', err);
            return res.status(500).json({
                error: 'Error',
                message: 'Unable to clear logs'
            });
        }
        
        console.log(`Logs cleared by ${clearedBy}`);
        res.json({ message: 'Logs cleared successfully' });
    });
}

// Download logs as file
function downloadLogs(req, res) {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'No logs available for download'
                });
            }
            console.error('Error reading log file:', err);
            return res.status(500).json({
                error: 'Error',
                message: 'Unable to download logs'
            });
        }
        
        const filename = `app-logs-${new Date().toISOString().split('T')[0]}.log`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(data);
    });
}

// Log validation failures (for Requirement 2.3)
function logValidationFailure(field, value, reason = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] VALIDATION FAILURE - Field: ${field}, Value: ${value}, Reason: ${reason}`;
    
    writeToLog(logMessage);
    console.log(logMessage);
}

module.exports = {
    errorHandler,
    notFoundHandler,
    logAuthAttempt,
    logAccessControlFailure,
    logValidationFailure,
    logError,
    getLogs,
    getRecentLogs,
    clearLogs,
    downloadLogs,
    writeToLog
};