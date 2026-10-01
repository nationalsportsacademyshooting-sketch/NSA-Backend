const mongoose = require("mongoose");

/* =========================================================
   DOCUMENT SCHEMA
   ========================================================= */

const documentSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            default: ""
        },

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
            default: undefined
        }
    },
    { _id: false }
);


/* =========================================================
   ATTENDANCE SCHEMA
   ========================================================= */

const attendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ["present", "absent", "leave"],
            required: true
        },

        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        remarks: {
            type: String,
            default: ""
        }
    },
    { _id: false }
);


/* =========================================================
   DAILY SCORE SCHEMA
   ========================================================= */

const dailyScoreSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true
        },

        score: {
            type: Number,
            default: 0
        },

        maximumScore: {
            type: Number,
            default: 0
        },

        remarks: {
            type: String,
            default: ""
        },

        enteredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { _id: false }
);


/* =========================================================
   USER SCHEMA
   ========================================================= */

const userSchema = new mongoose.Schema(
    {
        /* -------------------------------------------------
           LOGIN
        ------------------------------------------------- */

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["admin", "shooter"],
            default: "shooter",
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },


        /* -------------------------------------------------
           PERSONAL DETAILS
        ------------------------------------------------- */

        firstName: {
            type: String,
            trim: true,
            default: ""
        },

        lastName: {
            type: String,
            trim: true,
            default: ""
        },

        name: {
            type: String,
            trim: true,
            default: ""
        },

        fatherName: {
            type: String,
            trim: true,
            default: ""
        },

        motherName: {
            type: String,
            trim: true,
            default: ""
        },

        gender: {
            type: String,
            trim: true,
            default: ""
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            default: ""
        },

        mobile: {
            type: String,
            trim: true,
            default: ""
        },

        phone: {
            type: String,
            trim: true,
            default: ""
        },

        dob: {
            type: String,
            trim: true,
            default: ""
        },

        dateOfBirth: {
            type: Date,
            default: null
        },

        age: {
            type: Number,
            default: null
        },

        address: {
            type: String,
            trim: true,
            default: ""
        },


        /* -------------------------------------------------
           SCHOOL DETAILS
        ------------------------------------------------- */

        className: {
            type: String,
            trim: true,
            default: ""
        },

        section: {
            type: String,
            trim: true,
            default: ""
        },


        /* -------------------------------------------------
           SHOOTER ID
           
           Example:
           NSA1510201001
           NSA1510201002
           NSA1510201003
        ------------------------------------------------- */

        shooterId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        shooterIdSequence: {
            type: Number,
            default: null,
            sparse: true
        },


        /* -------------------------------------------------
           SHOOTING DETAILS
        ------------------------------------------------- */

        event: {
            type: String,
            trim: true,
            default: ""
        },

        category: {
            type: String,
            trim: true,
            default: ""
        },

        assignedTimeSlot: {
            type: String,
            trim: true,
            default: ""
        },


        /* -------------------------------------------------
           PROFILE PHOTO
           
           Stored as a document object.
        ------------------------------------------------- */

        profilePhoto: {
            type: documentSchema,
            default: null
        },


        /* -------------------------------------------------
           REQUIRED / OPTIONAL DOCUMENTS
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           APPROVAL / REJECTION
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           LOGIN SECURITY
        ------------------------------------------------- */

        lastLogin: {
            type: Date,
            default: null
        },

        loginAttempts: {
            type: Number,
            default: 0
        },

        lockUntil: {
            type: Date,
            default: null
        },


        /* -------------------------------------------------
           ATTENDANCE
        ------------------------------------------------- */

        attendance: {
            type: [attendanceSchema],
            default: []
        },


        /* -------------------------------------------------
           DAILY SCORES
        ------------------------------------------------- */

        dailyScores: {
            type: [dailyScoreSchema],
            default: []
        }
    },

    {
        timestamps: true
    }
);


/* =========================================================
   INDEXES
   ========================================================= */

/*
 * Admin shooter filtering/search.
 */
userSchema.index({
    role: 1,
    status: 1,
    name: 1
});


/*
 * Recent admin/shooter records.
 */
userSchema.index({
    role: 1,
    status: 1,
    createdAt: -1
});


/*
 * Email lookup.
 *
 * NOT unique because:
 * - rejected applications can be registered again
 * - approved/pending checking is handled by controller logic
 */
userSchema.index({
    email: 1
});


/*
 * Attendance date lookup.
 */
userSchema.index({
    "attendance.date": 1
});


/*
 * Shooter ID sequence-related lookup.
 */
userSchema.index({
    role: 1,
    dateOfBirth: 1,
    shooterIdSequence: -1
});


/* =========================================================
   IMPORTANT
   =========================================================

   DO NOT add:

   userSchema.index({ shooterId: 1 });

   shooterId already contains:

   unique: true,
   sparse: true

   so Mongoose already creates the required
   unique sparse index for shooterId.
   ========================================================= */


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = mongoose.model("User", userSchema);