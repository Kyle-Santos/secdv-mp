# Condo Bro Review Application

This project is a comprehensive condominium review application designed to enhance user engagement and personalization. At its core, the application allows users to edit and update their profiles and reviews, including personal information, bio, job details, and educational background. With support for photo uploads, the platform enables users to keep their profile and reviews up-to-date, fostering a more vibrant and connected user experience.

## Getting Started

### Built With

- **Express** - The web framework used.
- **MongoDB** - Database.
- **Node.js** - JavaScript runtime.

### Prerequisites

What you need to install the software and how to install them:

- Node.js
- npm
- MongoDB

### Installing

A step by step series of examples that tell you how to get a development environment running.

1. **Clone the repository to your local machine.**
   

2. **Navigate into the project directory.**


3. **Install the necessary packages.** Run the following command to install all required dependencies:

npm i express express-handlebars body-parser mongoose multer bcrypt express-session connect-mongodb-session


This command installs Express, Express Handlebars, Body-parser, Mongoose, Multer, Bcrypt, Express-session, and Connect-mongodb-session.

4. **Update the MongoDB connection string.** Open app.js where the MongoDB connection is established and change the connection string to your MongoDB instance. 

```javascript
// Replace the connection string with your MongoDB connection string
const mongoURI = process.env.MONGODB_URI; // from this 
const mongoURI = "mongodb://localhost:27017/condodb"; // to this
```

Ensure the database name condodb is correct. Adjust the connection string as necessary for your environment.

Set up a MongoDB database and ensure it's running. Connect to mongodb://localhost:27017.

Start the server. Run node app.js to start the application.

Import initial data. From the "data" folder, import condos.json, reviews.json, and users.json to the condos, reviews, and users collections respectively under condodb in the database.

Access the application. You should now have the server running on http://localhost:3000.

By following these steps, your development environment should be up and running, allowing you to start using or contributing to the Condo Bro Review Application.