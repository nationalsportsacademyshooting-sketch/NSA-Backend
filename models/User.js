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

    // One attendance entry per calendar date.  Keeping it on the shooter
    // account ensures attendance is always tied to the correct login/profile.
    attendance: [{
        date: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["present", "absent"],
            required: true
        }
    }],

    dailyScores: [{
    date: {
        type: String,
        required: true
    },

    series: [{
        type: Number,
        min: 0,
        max: 100
    }],

    total: {
        type: Number,
        required: true
    }
}],
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
