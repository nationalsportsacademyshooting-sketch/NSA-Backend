const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
        required: true,
        trim: true
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

    // Profile photo is stored as a data URL so the existing static
    // Netlify frontend can display it without a separate image server.
    // Keep uploads small (the controller enforces a 2 MB original-file
    // equivalent limit) so MongoDB's document size limit is not reached.
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

    attendance: [{
        date: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["present", "absent", "leave"],
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
    },

    // One active login session per account. A successful new login replaces
    // the previous session, which automatically signs the old browser/device out.
    activeSessionId: {
        type: String,
        default: null
    },

    activeSessionExpiresAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);
