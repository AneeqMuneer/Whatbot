const mongoose = require('mongoose');
const User = require('./schema.js');
const config = require("./config.js");

const dbConnect = async () => {
    await mongoose.connect(`mongodb://localhost:27017`).then(() => {
        console.log("DB server connected successfully.");
    }).catch((err) => {
        console.log("Connection with DB failed\n", err);
    });
}

module.exports = dbConnect;