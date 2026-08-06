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

    // Personal Details
    name: {
        type: String,
        required: true
    },

    category: {
        type: String,
        enum: ["NR", "ISSF"],
        required: true
    },

    age: {
        type: Number
    },

    mobile: {
        type: String,
        default: ""
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: "Male"
    },

    dob: {
        type: Date
    },

    profilePhoto: {
        type: String,
        default: ""
    },

    // Permanent Training Time
    assignedTimeSlot: {
        type: String,
        default: ""
    },

    // Login Security
    failedAttempts: {
        type: Number,
        default: 0
    },

    lockUntil: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);

