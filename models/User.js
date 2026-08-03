const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["admin", "shooter"],
        default: "shooter"
    },

    name: {
        type: String
    },

    category: {
        type: String,
        enum: ["NR", "ISSF"]
    },

    age: {
        type: Number
    }

}, {
    timestamps: true
});


module.exports = mongoose.model("User", userSchema);