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

        // Used by existing admin-created shooter system
        mobile: {
            type: String,
            default: ""
        },

        // Used by new registration system
        phone: {
            type: String,
            default: ""
        },

        gender: {
            type: String,
            default: ""
        },

        // Existing field
        dob: {
            type: String,
            default: ""
        },

        // Used by new registration system
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

            // OPTIONAL
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


module.exports = mongoose.model(
    "User",
    userSchema
);