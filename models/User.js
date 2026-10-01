const mongoose = require("mongoose");


// ============================================================
// DOCUMENT SCHEMA
// ============================================================

const documentSchema = new mongoose.Schema(
    {
        originalName: {
            type: String,
            default: ""
        },

        mimeType: {
            type: String,
            default: ""
        },

        size: {
            type: Number,
            default: 0
        },

        data: {
            type: Buffer,
            default: null
        }
    },
    {
        _id: false
    }
);


// ============================================================
// USER SCHEMA
// ============================================================

const userSchema = new mongoose.Schema(
    {
        // =====================================================
        // LOGIN
        // =====================================================

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },


        // =====================================================
        // ACCOUNT
        // =====================================================

        role: {
            type: String,
            enum: [
                "admin",
                "shooter"
            ],
            default: "shooter"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected"
            ],
            default: "approved"
        },


        // =====================================================
        // BASIC DETAILS
        // =====================================================

        name: {
            type: String,
            default: ""
        },

        firstName: {
            type: String,
            default: ""
        },

        lastName: {
            type: String,
            default: ""
        },

        fatherName: {
            type: String,
            default: ""
        },

        motherName: {
            type: String,
            default: ""
        },


        // =====================================================
        // PERSONAL DETAILS
        // =====================================================

        email: {
            type: String,
            default: "",
            lowercase: true,
            trim: true
        },

        mobile: {
            type: String,
            default: ""
        },

        phone: {
            type: String,
            default: ""
        },

        gender: {
            type: String,
            default: ""
        },

        dob: {
            type: String,
            default: ""
        },

        dateOfBirth: {
            type: String,
            default: ""
        },

        age: {
            type: Number,
            default: null
        },

        address: {
            type: String,
            default: ""
        },


        // =====================================================
        // SCHOOL DETAILS
        // =====================================================

        className: {
            type: String,
            default: ""
        },

        section: {
            type: String,
            default: ""
        },


        // =====================================================
        // SHOOTING DETAILS
        // =====================================================

        shooterId: {
            type: String,
            unique: true,
            sparse: true,
            default: null
        },

        shooterIdSequence: {
            type: Number,
            default: null,
            sparse: true
        },

        event: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            default: ""
        },

        assignedTimeSlot: {
            type: String,
            default: ""
        },


        // =====================================================
        // PROFILE PHOTO
        // =====================================================

        profilePhoto: {
            type: String,
            default: ""
        },


        // =====================================================
        // REGISTRATION DOCUMENTS
        // =====================================================

        documents: {
            passportPhoto: {
                type: documentSchema,
                default: null
            },

            identityProof: {
                type: documentSchema,
                default: null
            },

            birthCertificate: {
                type: documentSchema,
                default: null
            },

            affidavit: {
                type: documentSchema,
                default: null
            },

            schoolShooterId: {
                type: documentSchema,
                default: null
            }
        },


        // =====================================================
        // ADMIN APPROVAL
        // =====================================================

        rejectionReason: {
            type: String,
            default: ""
        },

        approvedAt: {
            type: Date,
            default: null
        },

        rejectedAt: {
            type: Date,
            default: null
        },


        // =====================================================
        // LOGIN SECURITY
        // =====================================================

        failedAttempts: {
            type: Number,
            default: 0
        },

        lockUntil: {
            type: Date,
            default: null
        },

        activeSessionId: {
            type: String,
            default: null
        },

        activeSessionExpiresAt: {
            type: Date,
            default: null
        },


        // =====================================================
        // ATTENDANCE
        // =====================================================

        attendance: [
            {
                date: {
                    type: String
                },

                status: {
                    type: String
                }
            }
        ],


        // =====================================================
        // DAILY SCORES
        // =====================================================

        dailyScores: [
            {
                date: {
                    type: String
                },

                series: {
                    type: [Number],
                    default: []
                },

                total: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },
    {
        timestamps: true
    }
);


// ============================================================
// INDEXES
// ============================================================

// Admin shooter queries
userSchema.index({
    role: 1,
    status: 1,
    name: 1
});

userSchema.index({
    role: 1,
    status: 1,
    createdAt: -1
});


// Email lookup
//
// NOT unique intentionally.
// This allows a rejected applicant to register again
// using the same email.
userSchema.index({
    email: 1
});


// Attendance lookup
userSchema.index({
    "attendance.date": 1
});


// Shooter ID generation / lookup
userSchema.index({
    role: 1,
    dateOfBirth: 1,
    shooterIdSequence: -1
});


// Shooter ID lookup
userSchema.index({
    shooterId: 1
});


// ============================================================
// MODEL
// ============================================================

module.exports = mongoose.model(
    "User",
    userSchema
);