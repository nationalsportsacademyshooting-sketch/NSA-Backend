const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;


// =========================================================
// TOKEN EXPIRY
// =========================================================

function getTokenExpiryDate() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}


// =========================================================
// PUBLIC USER DATA
// =========================================================

function publicUser(user) {
    return {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name || "",
        shooterId: user.shooterId || "",
        status: user.status || "",
        profilePhoto: user.profilePhoto || ""
    };
}


// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// =========================================================
// GENERATE UNIQUE NSA SHOOTER ID
// =========================================================
//
// DOB: 15/10/2010
//
// 1st shooter -> NSA1510201001
// 2nd shooter -> NSA1510201002
// 3rd shooter -> NSA1510201003
//
// Rejected applications are included while calculating the
// next sequence number. Therefore, re-registration gets a
// NEW Shooter ID.
//
// Example:
//
// Old rejected:
// NSA1510201001
//
// New registration:
// NSA1510201002
//
// =========================================================

async function generateShooterId(dobString) {
    const [year, month, day] = dobString.split("-");

    const dobPart = `${day}${month}${year}`;
    const prefix = `NSA${dobPart}`;

    const existingShooters = await User.find({
        role: "shooter",
        shooterId: {
            $regex: `^${escapeRegex(prefix)}\\d+$`
        }
    })
        .select("shooterId shooterIdSequence")
        .lean();

    let highestSequence = 0;

    for (const shooter of existingShooters) {
        // New records using shooterIdSequence
        const storedSequence = Number(
            shooter.shooterIdSequence
        );

        if (Number.isFinite(storedSequence)) {
            highestSequence = Math.max(
                highestSequence,
                storedSequence
            );
        }

        // Existing/old records without shooterIdSequence
        if (shooter.shooterId) {
            const suffix =
                shooter.shooterId.slice(prefix.length);

            const parsed =
                Number.parseInt(suffix, 10);

            if (Number.isFinite(parsed)) {
                highestSequence = Math.max(
                    highestSequence,
                    parsed
                );
            }
        }
    }

    let nextSequence = highestSequence + 1;

    while (true) {
        const sequenceString =
            String(nextSequence).padStart(2, "0");

        const shooterId =
            `${prefix}${sequenceString}`;

        const alreadyExists =
            await User.exists({
                shooterId
            });

        if (!alreadyExists) {
            return {
                shooterId,
                shooterIdSequence: nextSequence
            };
        }

        nextSequence++;
    }
}


// =========================================================
// REGISTER SHOOTER
// =========================================================

exports.register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            fatherName,
            motherName,
            gender,
            phone,
            email,
            username,
            address,
            class: className,
            section,
            dateOfBirth,
            event,
            category,
            password,
            confirmPassword,
            declaration
        } = req.body || {};


        // =====================================================
        // REQUIRED FIELDS
        // =====================================================

        if (
            !firstName ||
            !lastName ||
            !fatherName ||
            !motherName ||
            !gender ||
            !phone ||
            !email ||
            !address ||
            !className ||
            !section ||
            !dateOfBirth ||
            !event ||
            !category ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message:
                    "Please fill all required fields."
            });
        }


        // =====================================================
        // DECLARATION
        // =====================================================

        if (
            declaration !== true &&
            declaration !== "true"
        ) {
            return res.status(400).json({
                message:
                    "You must accept the declaration."
            });
        }


        // =====================================================
        // PHONE
        // =====================================================

        const normalizedPhone =
            String(phone).trim();

        if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
            return res.status(400).json({
                message:
                    "Please enter a valid 10-digit Indian mobile number."
            });
        }


        // =====================================================
        // EMAIL
        // =====================================================

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message:
                    "Please enter a valid email address."
            });
        }


        // =====================================================
        // USERNAME = EMAIL
        // =====================================================

        const normalizedUsername =
            normalizedEmail;

        if (
            username &&
            String(username)
                .trim()
                .toLowerCase() !== normalizedEmail
        ) {
            return res.status(400).json({
                message:
                    "Username must be the registered email address."
            });
        }


        // =====================================================
        // PASSWORD
        // =====================================================

        if (String(password).length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long."
            });
        }

        if (
            String(password) !==
            String(confirmPassword)
        ) {
            return res.status(400).json({
                message:
                    "Passwords do not match."
            });
        }


        // =====================================================
        // DATE OF BIRTH
        // =====================================================

        const dobString =
            String(dateOfBirth).trim();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dobString)) {
            return res.status(400).json({
                message:
                    "Invalid date of birth."
            });
        }

        const [year, month, day] =
            dobString.split("-");

        const dobDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
        );

        if (
            Number.isNaN(dobDate.getTime()) ||
            dobDate.getFullYear() !== Number(year) ||
            dobDate.getMonth() !== Number(month) - 1 ||
            dobDate.getDate() !== Number(day)
        ) {
            return res.status(400).json({
                message:
                    "Invalid date of birth."
            });
        }


        // =====================================================
        // CHECK EXISTING EMAIL / USERNAME
        // =====================================================
        //
        // APPROVED -> BLOCK
        // PENDING  -> BLOCK
        // REJECTED -> ALLOW NEW REGISTRATION
        //
        // A rejected application is kept until the new
        // registration has passed all validation.
        // =====================================================

        const matchingAccounts =
            await User.find({
                $or: [
                    {
                        username:
                            normalizedUsername
                    },
                    {
                        email:
                            normalizedEmail
                    }
                ]
            })
                .select(
                    "_id username email role status shooterId shooterIdSequence"
                )
                .lean();


        const blockingAccount =
            matchingAccounts.find(
                account =>
                    !(
                        account.role === "shooter" &&
                        account.status === "rejected"
                    )
            );


        if (blockingAccount) {
            if (
                blockingAccount.role === "shooter" &&
                blockingAccount.status === "pending"
            ) {
                return res.status(400).json({
                    message:
                        "An application with this email is already pending."
                });
            }

            return res.status(400).json({
                message:
                    "An account with this email already exists."
            });
        }


        // =====================================================
        // GENERATE NEW SHOOTER ID
        // =====================================================
        //
        // IMPORTANT:
        // This happens BEFORE deleting the rejected record.
        //
        // Therefore an old rejected ID is never reused.
        // =====================================================

        const generatedId =
            await generateShooterId(dobString);

        const shooterId =
            generatedId.shooterId;

        const shooterIdSequence =
            generatedId.shooterIdSequence;


        // =====================================================
        // FILES
        // =====================================================

        const files = req.files || {};

        const passportPhoto =
            files.passportPhoto?.[0];

        const identityProof =
            files.identityProof?.[0];

        const birthCertificate =
            files.birthCertificate?.[0];

        const affidavit =
            files.affidavit?.[0];

        const schoolShooterId =
            files.schoolShooterId?.[0];


        // =====================================================
        // REQUIRED DOCUMENTS
        // =====================================================

        if (!passportPhoto) {
            return res.status(400).json({
                message:
                    "Passport Size Photo is required."
            });
        }

        if (!identityProof) {
            return res.status(400).json({
                message:
                    "Age/Identity Proof is required."
            });
        }

        if (!birthCertificate) {
            return res.status(400).json({
                message:
                    "Birth Certificate is required."
            });
        }

        if (!schoolShooterId) {
            return res.status(400).json({
                message:
                    "School ID Card/Shooter ID Card is required."
            });
        }


        // =====================================================
        // UPLOADED FILES
        // =====================================================

        const uploadedFiles = [
            passportPhoto,
            identityProof,
            birthCertificate,
            affidavit,
            schoolShooterId
        ].filter(Boolean);


        // =====================================================
        // FILE SIZE
        // =====================================================

        for (const file of uploadedFiles) {
            if (file.size > DOCUMENT_MAX_BYTES) {
                return res.status(413).json({
                    message:
                        `${file.originalname} is larger than 2 MB.`
                });
            }
        }


        // =====================================================
        // ALLOWED FILE TYPES
        // =====================================================

        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        for (const file of uploadedFiles) {
            if (
                !allowedMimeTypes.includes(
                    file.mimetype
                )
            ) {
                return res.status(400).json({
                    message:
                        `${file.originalname} has an unsupported file type. Only JPG, JPEG, PNG and PDF are allowed.`
                });
            }
        }


        // =====================================================
        // PASSPORT PHOTO SIZE
        // =====================================================

        if (
            passportPhoto.size >
            PROFILE_PHOTO_MAX_BYTES
        ) {
            return res.status(413).json({
                message:
                    "Passport photo must be 2 MB or smaller."
            });
        }


        // =====================================================
        // DELETE OLD REJECTED APPLICATIONS
        // =====================================================
        //
        // IMPORTANT:
        // This is deliberately AFTER all new registration
        // file validation.
        //
        // If the new registration has an invalid/missing file,
        // the old rejected application remains available.
        // =====================================================

        const rejectedAccounts =
            matchingAccounts.filter(
                account =>
                    account.role === "shooter" &&
                    account.status === "rejected"
            );


        if (rejectedAccounts.length > 0) {
            await User.deleteMany({
                _id: {
                    $in:
                        rejectedAccounts.map(
                            account => account._id
                        )
                }
            });
        }


        // =====================================================
        // FINAL DUPLICATE SHOOTER ID CHECK
        // =====================================================

        const existingShooterId =
            await User.findOne({
                shooterId
            })
                .select("_id")
                .lean();

        if (existingShooterId) {
            return res.status(409).json({
                message:
                    "This Shooter ID already exists. Please try registration again."
            });
        }


        // =====================================================
        // HASH PASSWORD
        // =====================================================

        const hashedPassword =
            await bcrypt.hash(
                String(password),
                10
            );


        // =====================================================
        // FULL NAME
        // =====================================================

        const fullName =
            `${String(firstName).trim()} ${String(lastName).trim()}`
                .trim();


        // =====================================================
        // CREATE USER
        // =====================================================

        const user = new User({
            username:
                normalizedUsername,

            password:
                hashedPassword,

            role:
                "shooter",

            status:
                "pending",

            name:
                fullName,

            firstName:
                String(firstName).trim(),

            lastName:
                String(lastName).trim(),

            fatherName:
                String(fatherName).trim(),

            motherName:
                String(motherName).trim(),

            gender:
                String(gender).trim(),

            mobile:
                normalizedPhone,

            phone:
                normalizedPhone,

            email:
                normalizedEmail,

            address:
                String(address).trim(),

            className:
                String(className).trim(),

            section:
                String(section).trim(),

            dob:
                dobString,

            dateOfBirth:
                dobString,

            shooterId:
                shooterId,

            shooterIdSequence:
                shooterIdSequence,

            event:
                String(event).trim(),

            category:
                String(category).trim(),

            rejectionReason:
                "",

            approvedAt:
                null,

            rejectedAt:
                null,

            profilePhoto:
                "",

            documents: {
                passportPhoto: {
                    data:
                        passportPhoto.buffer,

                    mimeType:
                        passportPhoto.mimetype,

                    originalName:
                        passportPhoto.originalname,

                    size:
                        passportPhoto.size
                },

                identityProof: {
                    data:
                        identityProof.buffer,

                    mimeType:
                        identityProof.mimetype,

                    originalName:
                        identityProof.originalname,

                    size:
                        identityProof.size
                },

                birthCertificate: {
                    data:
                        birthCertificate.buffer,

                    mimeType:
                        birthCertificate.mimetype,

                    originalName:
                        birthCertificate.originalname,

                    size:
                        birthCertificate.size
                },

                affidavit:
                    affidavit
                        ? {
                            data:
                                affidavit.buffer,

                            mimeType:
                                affidavit.mimetype,

                            originalName:
                                affidavit.originalname,

                            size:
                                affidavit.size
                        }
                        : null,

                schoolShooterId: {
                    data:
                        schoolShooterId.buffer,

                    mimeType:
                        schoolShooterId.mimetype,

                    originalName:
                        schoolShooterId.originalname,

                    size:
                        schoolShooterId.size
                }
            }
        });


        // =====================================================
        // SAVE
        // =====================================================

        await user.save();


        // =====================================================
        // SUCCESS
        // =====================================================

        return res.status(201).json({
            message:
                "Registration submitted successfully. Your account is waiting for admin approval.",

            shooterId:
                shooterId,

            username:
                normalizedUsername,

            status:
                "pending"
        });


    } catch (err) {
        console.error(
            "Registration error:",
            err
        );

        if (err?.code === 11000) {
            if (err.keyPattern?.username) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists."
                });
            }

            if (err.keyPattern?.email) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists."
                });
            }

            if (err.keyPattern?.shooterId) {
                return res.status(409).json({
                    message:
                        "This Shooter ID already exists. Please try registration again."
                });
            }
        }

        return res.status(500).json({
            message:
                err.message ||
                "Registration failed."
        });
    }
};


// =========================================================
// LOGIN
// =========================================================

exports.login = async (req, res) => {
    try {
        const username =
            String(req.body?.username || "")
                .trim()
                .toLowerCase();

        const password =
            String(req.body?.password || "");

        if (!username || !password) {
            return res.status(400).json({
                message:
                    "Username and password are required."
            });
        }

        const user =
            await User.findOne({
                username
            });

        if (!user) {
            return res.status(400).json({
                message:
                    "Invalid username or password"
            });
        }


        // =====================================================
        // INITIALISE SECURITY FIELDS
        // =====================================================

        if (user.failedAttempts === undefined) {
            user.failedAttempts = 0;
        }

        if (user.activeSessionId === undefined) {
            user.activeSessionId = null;
        }

        if (
            user.activeSessionExpiresAt === undefined
        ) {
            user.activeSessionExpiresAt = null;
        }


        // =====================================================
        // ACCOUNT LOCK
        // =====================================================

        if (
            user.lockUntil &&
            user.lockUntil > new Date()
        ) {
            const secondsLeft =
                Math.ceil(
                    (user.lockUntil - new Date()) / 1000
                );

            return res.status(429).json({
                message:
                    `Too many failed attempts. Please wait ${secondsLeft} seconds.`,

                secondsLeft
            });
        }


        // =====================================================
        // EXPIRED LOCK
        // =====================================================

        if (
            user.lockUntil &&
            user.lockUntil <= new Date()
        ) {
            user.failedAttempts = 0;
            user.lockUntil = null;

            await user.save();
        }


        // =====================================================
        // PASSWORD
        // =====================================================

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {
            user.failedAttempts =
                (user.failedAttempts || 0) + 1;

            let lockSeconds = 0;

            if (user.failedAttempts > 5) {
                lockSeconds =
                    Math.min(
                        300,
                        10 +
                        (
                            (user.failedAttempts - 6) * 5
                        )
                    );

                user.lockUntil =
                    new Date(
                        Date.now() +
                        lockSeconds * 1000
                    );
            }

            await user.save();

            if (user.failedAttempts > 5) {
                return res.status(429).json({
                    message:
                        `Too many failed attempts. Please wait ${lockSeconds} seconds.`,

                    secondsLeft:
                        lockSeconds
                });
            }

            return res.status(400).json({
                message:
                    "Invalid username or password"
            });
        }


        // =====================================================
        // APPROVAL CHECK
        // =====================================================

        if (
            user.role === "shooter" &&
            user.status !== "approved"
        ) {
            if (user.status === "rejected") {
                return res.status(403).json({
                    message:
                        user.rejectionReason
                            ? `Registration rejected: ${user.rejectionReason}`
                            : "Your registration has been rejected by the admin."
                });
            }

            return res.status(403).json({
                message:
                    "Your registration is pending admin approval."
            });
        }


        // =====================================================
        // SUCCESSFUL LOGIN
        // =====================================================

        user.failedAttempts = 0;
        user.lockUntil = null;

        const sessionId =
            crypto.randomUUID();

        const sessionExpiresAt =
            getTokenExpiryDate();

        const token =
            jwt.sign(
                {
                    id:
                        user._id,

                    role:
                        user.role,

                    sessionId:
                        sessionId
                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        "1d"
                }
            );

        user.activeSessionId =
            sessionId;

        user.activeSessionExpiresAt =
            sessionExpiresAt;

        await user.save();

        return res.json({
            message:
                "Login Successful",

            token:
                token,

            user:
                publicUser(user),

            sessionExpiresAt:
                sessionExpiresAt.toISOString()
        });


    } catch (err) {
        console.error(
            "Login error:",
            err
        );

        return res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// LOGOUT
// =========================================================

exports.logout = async (req, res) => {
    try {
        const user =
            await User.findById(
                req.user.id
            );

        if (
            user &&
            (
                !req.user.sessionId ||
                user.activeSessionId ===
                    req.user.sessionId
            )
        ) {
            user.activeSessionId = null;
            user.activeSessionExpiresAt = null;

            await user.save();
        }

        res.json({
            message:
                "Logged out successfully"
        });

    } catch (err) {
        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET MY PROFILE
// =========================================================

exports.getMyProfile = async (req, res) => {
    try {
        const user =
            await User.findById(
                req.user.id
            )
                .select(
                    "-password " +
                    "-failedAttempts " +
                    "-lockUntil " +
                    "-activeSessionId " +
                    "-activeSessionExpiresAt " +
                    "-documents"
                )
                .lean();

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found"
            });
        }

        const documentUser =
            await User.findById(
                req.user.id
            )
                .select(
                    "documents.identityProof " +
                    "documents.birthCertificate " +
                    "documents.affidavit " +
                    "documents.schoolShooterId"
                )
                .lean();

        const storedDocuments =
            documentUser?.documents || {};

        const documents = {
            identityProof:
                storedDocuments.identityProof
                    ? {
                        mimeType:
                            storedDocuments.identityProof.mimeType || "",

                        originalName:
                            storedDocuments.identityProof.originalName || "",

                        size:
                            storedDocuments.identityProof.size || 0
                    }
                    : null,

            birthCertificate:
                storedDocuments.birthCertificate
                    ? {
                        mimeType:
                            storedDocuments.birthCertificate.mimeType || "",

                        originalName:
                            storedDocuments.birthCertificate.originalName || "",

                        size:
                            storedDocuments.birthCertificate.size || 0
                    }
                    : null,

            affidavit:
                storedDocuments.affidavit
                    ? {
                        mimeType:
                            storedDocuments.affidavit.mimeType || "",

                        originalName:
                            storedDocuments.affidavit.originalName || "",

                        size:
                            storedDocuments.affidavit.size || 0
                    }
                    : null,

            schoolShooterId:
                storedDocuments.schoolShooterId
                    ? {
                        mimeType:
                            storedDocuments.schoolShooterId.mimeType || "",

                        originalName:
                            storedDocuments.schoolShooterId.originalName || "",

                        size:
                            storedDocuments.schoolShooterId.size || 0
                    }
                    : null
        };

        return res.status(200).json({
            success:
                true,

            id:
                user._id,

            shooterId:
                user.shooterId || "",

            name:
                user.name || "",

            firstName:
                user.firstName || "",

            lastName:
                user.lastName || "",

            fatherName:
                user.fatherName || "",

            motherName:
                user.motherName || "",

            username:
                user.username || "",

            mobile:
                user.mobile || "",

            phone:
                user.phone ||
                user.mobile ||
                "",

            email:
                user.email ||
                user.username ||
                "",

            dob:
                user.dob ||
                user.dateOfBirth ||
                "",

            dateOfBirth:
                user.dateOfBirth ||
                user.dob ||
                "",

            age:
                user.age ?? "",

            category:
                user.category || "",

            event:
                user.event || "",

            gender:
                user.gender || "",

            className:
                user.className ||
                user.class ||
                "",

            section:
                user.section || "",

            address:
                user.address || "",

            assignedTimeSlot:
                user.assignedTimeSlot || "",

            profilePhoto:
                "",

            documents:
                documents,

            status:
                user.status || "",

            role:
                user.role || ""
        });

    } catch (error) {
        console.error(
            "GET MY PROFILE ERROR:",
            error
        );

        return res.status(500).json({
            success:
                false,

            message:
                "Failed to load profile",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
};


// =========================================================
// GET MY PROFILE PHOTO
// =========================================================

exports.getMyProfilePhoto = async (req, res) => {
    try {
        const user =
            await User.findOne({
                _id:
                    req.user.id,

                role:
                    "shooter"
            }).select(
                "documents.passportPhoto"
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found"
            });
        }

        const photo =
            user.documents?.passportPhoto;

        if (!photo || !photo.data) {
            return res.status(404).json({
                message:
                    "Profile photo not found"
            });
        }

        let photoBuffer;

        if (Buffer.isBuffer(photo.data)) {
            photoBuffer = photo.data;
        } else if (
            photo.data.buffer &&
            Buffer.isBuffer(photo.data.buffer)
        ) {
            photoBuffer = photo.data.buffer;
        } else {
            try {
                photoBuffer =
                    Buffer.from(photo.data);
            } catch (bufferError) {
                console.error(
                    "Photo buffer conversion error:",
                    bufferError
                );

                return res.status(500).json({
                    message:
                        "Invalid profile photo data"
                });
            }
        }

        if (
            !photoBuffer ||
            photoBuffer.length === 0
        ) {
            return res.status(404).json({
                message:
                    "Profile photo is empty"
            });
        }

        res.set({
            "Content-Type":
                photo.mimeType ||
                "image/jpeg",

            "Content-Disposition":
                `inline; filename="${String(
                    photo.originalName ||
                    "profile-photo"
                ).replace(/"/g, "")}"`,

            "Cache-Control":
                "no-store",

            "Content-Length":
                photoBuffer.length
        });

        return res.send(photoBuffer);

    } catch (error) {
        console.error(
            "GET MY PROFILE PHOTO ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to load profile photo",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
};


// =========================================================
// UPDATE MY PROFILE
// =========================================================

exports.updateMyProfile = async (req, res) => {
    try {
        const user =
            await User.findById(
                req.user.id
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found"
            });
        }

        const body =
            req.body || {};

        const allowedFields = [
            "name",
            "username",
            "mobile",
            "phone",
            "email",
            "dob",
            "dateOfBirth",
            "age",
            "gender",
            "className",
            "section",
            "address",
            "category",
            "event",
            "assignedTimeSlot"
        ];


        // =====================================================
        // USERNAME
        // =====================================================

        if (body.username !== undefined) {
            const username =
                String(body.username)
                    .trim()
                    .toLowerCase();

            if (!username) {
                return res.status(400).json({
                    message:
                        "Username is required"
                });
            }

            const duplicate =
                await User.findOne({
                    username,

                    _id: {
                        $ne:
                            user._id
                    }
                });

            if (duplicate) {
                return res.status(409).json({
                    message:
                        "Username already exists"
                });
            }

            user.username =
                username;
        }


        // =====================================================
        // OTHER FIELDS
        // =====================================================

        for (const field of allowedFields) {
            if (field === "username") {
                continue;
            }

            if (body[field] !== undefined) {
                user[field] =
                    body[field];
            }
        }


        // =====================================================
        // PASSWORD
        // =====================================================

        if (body.password) {
            user.password =
                await bcrypt.hash(
                    String(body.password),
                    10
                );
        }


        // =====================================================
        // PROFILE PHOTO
        // =====================================================

        if (
            body.profilePhoto !==
            undefined
        ) {
            const photo =
                String(
                    body.profilePhoto || ""
                );

            if (
                photo &&
                !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(
                    photo
                )
            ) {
                return res.status(400).json({
                    message:
                        "Profile photo must be a PNG, JPG, WEBP or GIF image."
                });
            }

            if (photo) {
                const commaIndex =
                    photo.indexOf(",");

                const base64Part =
                    commaIndex >= 0
                        ? photo.slice(
                            commaIndex + 1
                        )
                        : "";

                const estimatedBytes =
                    Math.floor(
                        (
                            base64Part.length *
                            3
                        ) / 4
                    );

                if (
                    estimatedBytes >
                    PROFILE_PHOTO_MAX_BYTES
                ) {
                    return res.status(413).json({
                        message:
                            "Profile photo is too large. Please choose an image under 2 MB."
                    });
                }
            }

            user.profilePhoto =
                photo;
        }

        await user.save();

        res.json({
            message:
                "Profile updated successfully",

            user:
                publicUser(user)
        });

    } catch (err) {
        console.error(
            "Update my profile error:",
            err
        );

        if (err?.code === 11000) {
            return res.status(409).json({
                message:
                    "Username already exists"
            });
        }

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// CHANGE ADMIN USERNAME & PASSWORD
// =========================================================

exports.changeAdmin = async (req, res) => {
    try {
        const {
            currentUsername,
            currentPassword,
            newUsername,
            newPassword
        } = req.body;

        const user =
            await User.findById(
                req.user.id
            );

        if (
            !user ||
            user.role !== "admin"
        ) {
            return res.status(404).json({
                message:
                    "Admin not found"
            });
        }

        if (
            currentUsername &&
            String(currentUsername)
                .trim()
                .toLowerCase() !==
            user.username
        ) {
            return res.status(400).json({
                message:
                    "Current username is incorrect."
            });
        }

        if (currentPassword) {
            const passwordMatches =
                await bcrypt.compare(
                    String(currentPassword),
                    user.password
                );

            if (!passwordMatches) {
                return res.status(401).json({
                    message:
                        "Current password is incorrect."
                });
            }
        }

        if (newUsername) {
            user.username =
                String(newUsername)
                    .trim()
                    .toLowerCase();
        }

        if (newPassword) {
            user.password =
                await bcrypt.hash(
                    String(newPassword),
                    10
                );
        }

        await user.save();

        res.json({
            message:
                "Admin account updated successfully"
        });

    } catch (err) {
        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// FORGOT / RESET PASSWORD
// =========================================================

exports.resetPassword = async (req, res) => {
    try {
        const accountType =
            String(
                req.body?.accountType || "shooter"
            )
                .trim()
                .toLowerCase();

        const username =
            String(
                req.body?.username || ""
            )
                .trim()
                .toLowerCase();

        const newPassword =
            String(
                req.body?.newPassword || ""
            );

        const confirmPassword =
            String(
                req.body?.confirmPassword || ""
            );

        if (
            !username ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                message:
                    "Username and new password are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long."
            });
        }

        if (
            newPassword !==
            confirmPassword
        ) {
            return res.status(400).json({
                message:
                    "Passwords do not match."
            });
        }


        // =====================================================
        // ADMIN RESET
        // =====================================================

        if (accountType === "admin") {
            const recoveryCode =
                String(
                    req.body?.recoveryCode || ""
                );

            const configuredCode =
                String(
                    process.env.ADMIN_RECOVERY_CODE || ""
                ).trim();

            if (
                !configuredCode ||
                configuredCode ===
                    "CHANGE_THIS_TO_A_PRIVATE_RECOVERY_CODE" ||
                recoveryCode !== configuredCode
            ) {
                return res.status(403).json({
                    message:
                        "Invalid recovery code."
                });
            }

            const admin =
                await User.findOne({
                    username,
                    role:
                        "admin"
                });

            if (!admin) {
                return res.status(404).json({
                    message:
                        "Admin account not found."
                });
            }

            admin.password =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            admin.failedAttempts = 0;
            admin.lockUntil = null;
            admin.activeSessionId = null;
            admin.activeSessionExpiresAt = null;

            await admin.save();

            return res.json({
                message:
                    "Admin password reset successfully. Please login again."
            });
        }


        // =====================================================
        // SHOOTER RESET
        // =====================================================

        const email =
            String(
                req.body?.email || ""
            )
                .trim()
                .toLowerCase();

        const phone =
            String(
                req.body?.phone || ""
            ).trim();

        const dateOfBirth =
            String(
                req.body?.dateOfBirth || ""
            ).trim();

        if (
            !email ||
            !phone ||
            !dateOfBirth
        ) {
            return res.status(400).json({
                message:
                    "Username, email, phone number and date of birth are required."
            });
        }

        const shooter =
            await User.findOne({
                username,
                role:
                    "shooter",
                status:
                    "approved",
                email,
                $and: [
                    {
                        $or: [
                            { phone },
                            { mobile: phone }
                        ]
                    },
                    {
                        $or: [
                            { dateOfBirth },
                            { dob: dateOfBirth }
                        ]
                    }
                ]
            });

        if (!shooter) {
            return res.status(400).json({
                message:
                    "The account details could not be verified."
            });
        }

        shooter.password =
            await bcrypt.hash(
                newPassword,
                10
            );

        shooter.failedAttempts = 0;
        shooter.lockUntil = null;
        shooter.activeSessionId = null;
        shooter.activeSessionExpiresAt = null;

        await shooter.save();

        return res.json({
            message:
                "Password reset successfully. Please login again."
        });

    } catch (err) {
        console.error(
            "Reset password error:",
            err
        );

        return res.status(500).json({
            message:
                "Unable to reset password."
        });
    }
};


// =========================================================
// GET ALL APPROVED SHOOTERS
// =========================================================

exports.getShooters = async (req, res) => {
    try {
        const shooters =
            await User.find(
                {
                    role:
                        "shooter",

                    status:
                        "approved"
                },

                "-password " +
                "-documents.passportPhoto.data " +
                "-documents.identityProof.data " +
                "-documents.birthCertificate.data " +
                "-documents.affidavit.data " +
                "-documents.schoolShooterId.data"
            )
                .sort({ name: 1 })
                .allowDiskUse(true)
                .lean();

        res.json(shooters);

    } catch (err) {
        console.error(
            "Get shooters error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET PENDING REGISTRATION REQUESTS
// =========================================================

exports.getPendingShooters = async (req, res) => {
    try {
        const shooters =
            await User.find(
                {
                    role:
                        "shooter",

                    status:
                        "pending"
                },

                "-password " +
                "-documents.passportPhoto.data " +
                "-documents.identityProof.data " +
                "-documents.birthCertificate.data " +
                "-documents.affidavit.data " +
                "-documents.schoolShooterId.data"
            )
                .sort({ createdAt: -1 })
                .allowDiskUse(true)
                .lean();

        res.json(shooters);

    } catch (err) {
        console.error(
            "Get pending shooters error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET SHOOTER DETAILS
// =========================================================

exports.getShooterDetails = async (req, res) => {
    try {
        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter"
            }).select(
                "-password " +
                "-failedAttempts " +
                "-lockUntil " +
                "-activeSessionId " +
                "-activeSessionExpiresAt"
            );

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }

        const result =
            shooter.toObject();

        if (result.documents) {
            Object.keys(
                result.documents
            ).forEach(key => {
                if (result.documents[key]) {
                    const doc =
                        result.documents[key];

                    doc.available =
                        !!(
                            doc.mimeType ||
                            doc.originalName ||
                            doc.size > 0
                        );

                    delete doc.data;
                }
            });
        }

        res.json(result);

    } catch (err) {
        console.error(
            "Get shooter details error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// APPROVE SHOOTER
// =========================================================

exports.approveShooter = async (req, res) => {
    try {
        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter",

                status:
                    "pending"
            });

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Pending shooter not found"
            });
        }

        shooter.status =
            "approved";

        shooter.rejectionReason =
            "";

        shooter.approvedAt =
            new Date();

        shooter.rejectedAt =
            null;

        await shooter.save();

        res.json({
            message:
                "Shooter approved successfully.",

            shooterId:
                shooter.shooterId,

            status:
                shooter.status
        });

    } catch (err) {
        console.error(
            "Approve shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// REJECT SHOOTER
// =========================================================

exports.rejectShooter = async (req, res) => {
    try {
        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter",

                status:
                    "pending"
            });

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Pending shooter not found"
            });
        }

        const reason =
            String(
                req.body?.reason ||
                req.body?.rejectionReason ||
                ""
            )
                .trim();

        if (!reason) {
            return res.status(400).json({
                message:
                    "A rejection reason is required."
            });
        }

        shooter.status =
            "rejected";

        shooter.rejectionReason =
            reason;

        shooter.rejectedAt =
            new Date();

        shooter.approvedAt =
            null;

        shooter.activeSessionId =
            null;

        shooter.activeSessionExpiresAt =
            null;

        await shooter.save();

        res.json({
            message:
                "Shooter registration rejected.",

            shooterId:
                shooter.shooterId,

            status:
                shooter.status,

            rejectionReason:
                shooter.rejectionReason
        });

    } catch (err) {
        console.error(
            "Reject shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET REGISTRATION DOCUMENT
// =========================================================

exports.getShooterDocument = async (req, res) => {
    try {
        const {
            id,
            document
        } = req.params;

        const allowedDocuments = [
            "passportPhoto",
            "identityProof",
            "birthCertificate",
            "affidavit",
            "schoolShooterId"
        ];

        if (
            !allowedDocuments.includes(
                document
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid document type."
            });
        }

        const shooter =
            await User.findOne({
                _id:
                    id,

                role:
                    "shooter"
            }).select(
                `documents.${document}`
            );

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Shooter not found."
            });
        }

        const file =
            shooter.documents?.[document];

        if (!file || !file.data) {
            return res.status(404).json({
                message:
                    "Document not found."
            });
        }

        res.set(
            "Content-Type",
            file.mimeType ||
            "application/octet-stream"
        );

        if (file.originalName) {
            res.set(
                "Content-Disposition",
                `inline; filename="${file.originalName.replace(/"/g, "")}"`
            );
        }

        return res.send(file.data);

    } catch (err) {
        console.error(
            "Get document error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET MY ATTENDANCE
// =========================================================

exports.getMyAttendance = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({
                message:
                    "Shooter access required"
            });
        }

        const shooter =
            await User.findById(
                req.user.id,
                "name className attendance"
            );

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }

        const attendance =
            [...(shooter.attendance || [])]
                .sort(
                    (first, second) =>
                        second.date.localeCompare(
                            first.date
                        )
                );

        res.json({
            name:
                shooter.name,

            className:
                shooter.className,

            attendance
        });

    } catch (err) {
        res.status(500).json({
            message:
                err.message
        });
    }
};


// =========================================================
// GET MY DAILY SCORES
// =========================================================

exports.getMyDailyScores = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({
                message:
                    "Shooter access required"
            });
        }

        const shooter =
            await User.findById(
                req.user.id,
                "name category dailyScores"
            );

        if (!shooter) {
            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }

        const dailyScores =
            [...(shooter.dailyScores || [])]
                .sort(
                    (first, second) =>
                        second.date.localeCompare(
                            first.date
                        )
                );

        res.json({
            name:
                shooter.name,

            category:
                shooter.category,

            dailyScores
        });

    } catch (error) {
        res.status(500).json({
            message:
                error.message
        });
    }
};


// =========================================================
// GET MY PROFILE DOCUMENT
// =========================================================

exports.getMyProfileDocument = async (req, res) => {
    try {
        const allowedDocuments = {
            identityProof:
                "identityProof",

            birthCertificate:
                "birthCertificate",

            affidavit:
                "affidavit",

            schoolShooterId:
                "schoolShooterId"
        };

        const documentName =
            allowedDocuments[
                req.params.document
            ];

        if (!documentName) {
            return res.status(400).json({
                message:
                    "Invalid document"
            });
        }

        const user =
            await User.findOne({
                _id:
                    req.user.id,

                role:
                    "shooter"
            }).select(
                `documents.${documentName}`
            );

        if (
            !user ||
            !user.documents ||
            !user.documents[documentName]
        ) {
            return res.status(404).json({
                message:
                    "Document not found"
            });
        }

        const document =
            user.documents[documentName];

        if (!document.data) {
            return res.status(404).json({
                message:
                    "Document not uploaded"
            });
        }

        res.set({
            "Content-Type":
                document.mimeType ||
                "application/pdf",

            "Content-Disposition":
                `inline; filename="${String(
                    document.originalName ||
                    documentName
                ).replace(/"/g, "")}"`,

            "Cache-Control":
                "no-store"
        });

        return res.send(
            document.data
        );

    } catch (error) {
        console.error(
            "Get my profile document error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to load document",

            error:
                process.env.NODE_ENV === "production"
                    ? undefined
                    : error.message
        });
    }
};