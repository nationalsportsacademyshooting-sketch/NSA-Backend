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

    // ==========================
    // PERSONAL DETAILS
    // ==========================

    name: {
        type: String,
        required: true
    },

    category: {
        type: String,
        enum: ["NR", "ISSF"],
        default: "NR"
    },

    event: {
        type: String,
        default: ""
    },

    age: {
        type: Number
    },

    mobile: {
        type: String,
        default: ""
    },

    email: {
        type: String,
        default: ""
    },

    dob: {
        type: Date
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: "Male"
    },

    className: {
        type: String,
        default: ""
    },

    profilePhoto: {
        type: String,
        default: ""
    },

    // ==========================
    // TRAINING TIME
    // ==========================

    assignedTimeSlot: {
        type: String,
        default: ""
    },

    // ==========================
    // LOGIN SECURITY
    // ==========================

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