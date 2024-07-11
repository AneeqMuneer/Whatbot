const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    Number : {
        type : String,
        unique : [true , "Duplicate number entered"],
        required : [true , "Please enter a number"],
        match : [/^\+\d{12}$/ , "Incorrect number format"]
    },
    Name : {
        type : String,
        match : [/[A-Za-z]+[0-9]*/ , "Incorrect name format"],
        minlength : [5 , "Name can't be shorter than 5 characters"],
        maxlength : [30 , "Name can't be longer than 30 characters"]
    },
    chatMessage : [
        {
            Content : {
                type : String,
                match : [/[A-Za-z]+/ , "Incorrect message format"],
                maxlength : [500 , "A message can't be longer than 500 characters"],
            },
            Timestamp : {
                type : Date,
                default : Date.now
            },
            Type : {
                type : String,
                default : "text"
            },
            Tag : {
                type : String,
                required : [true , "Please enter the message tag"],
                match : [/NP|GP|PP|IP/ , "Incorrect message tag entered"]
            }
        }
    ],
    state : {
        type : Number,
        default : 0
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;