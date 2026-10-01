const mongoose = require("mongoose");

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

const userSchema = new mongoose.Schema(
    {
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

        shooterId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },

        /*
         * Sequence used for IDs such as:
         * NSA1510201001
         * NSA1510201002
         * NSA1510201003
         *
         * It is NOT unique globally because the sequence restarts
         * for a different DOB prefix.
         */
        shooterIdSequence: {
            type: Number,
            default: null,
            sparse: true
        },

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

        profilePhoto: {
            type: documentSchema,
            default: null
        },

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

        attendance: {
            type: [attendanceSchema],
            default: []
        },

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
 * Used for admin shooter filtering/search.
 */
userSchema.index({
    role: 1,
    status: 1,
    name: 1
});

/*
 * Used for recent shooter/admin records.
 */
userSchema.index({
    role: 1,
    status: 1,
    createdAt: -1
});

/*
 * Email lookup.
 *
 * NOT unique because rejected applications must be allowed
 * to exist temporarily and the same email can be registered
 * again after rejection.
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
 * Helps with shooter ID sequence-related queries.
 */
userSchema.index({
    role: 1,
    dateOfBirth: 1,
    shooterIdSequence: -1
});


/*
 * IMPORTANT:
 *
 * DO NOT add:
 *
 * userSchema.index({ shooterId: 1 });
 *
 * because shooterId already has:
 *
 * unique: true,
 * sparse: true
 *
 * above, which creates the required index.
 */


module.exports = mongoose.model("User", userSchema);