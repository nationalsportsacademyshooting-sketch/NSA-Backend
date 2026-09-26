const User = require("../models/User");
const Booking = require("../models/booking");
const bcrypt = require("bcrypt");


// ============================================================
// HELPER: BASE64 TO BUFFER
// ============================================================

function convertBase64ToBuffer(base64) {

    if (!base64) {
        return null;
    }

    if (
        typeof base64 === "string" &&
        base64.includes(",")
    ) {
        base64 =
            base64.split(",")[1];
    }

    return Buffer.from(
        base64,
        "base64"
    );
}


// ============================================================
// CREATE SHOOTER
// ============================================================

exports.createShooter = async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied"
            });
        }


        const {
            name,
            username,
            password,
            category,
            event,
            age,
            mobile,
            email,
            dob,
            gender,
            className,
            assignedTimeSlot,
            profilePhoto
        } = req.body;


        const existingUser =
            await User.findOne({
                username
            });


        if (existingUser) {
            return res.status(400).json({
                message:
                    "Username already exists"
            });
        }


        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        const shooter =
            new User({

                name,

                username,

                password:
                    hashedPassword,

                role:
                    "shooter",

                status:
                    "approved",

                category,

                event,

                age,

                mobile,

                email,

                dob,

                gender,

                className,

                assignedTimeSlot,

                profilePhoto:
                    profilePhoto || ""

            });


        await shooter.save();


        res.status(201).json({

            message:
                "Shooter created successfully",

            shooter

        });


    } catch (err) {

        console.error(
            "Create shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// GET ALL APPROVED SHOOTERS
// ============================================================

exports.getShooters = async (req, res) => {
    try {

        const shooters =
            await User.find(
                {
                    role: "shooter",
                    status: "approved"
                },
                "-password -documents.data"
            )
            .sort({
                name: 1
            });


        res.json(
            shooters
        );


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


// ============================================================
// GET SINGLE APPROVED SHOOTER
// ============================================================

exports.getShooter = async (req, res) => {
    try {

        const shooter =
            await User.findOne(
                {
                    _id:
                        req.params.id,

                    role:
                        "shooter",

                    status:
                        "approved"
                },
                "-password -documents.data"
            );


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        res.json(
            shooter
        );


    } catch (err) {

        console.error(
            "Get shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// GET PENDING SHOOTERS
// ============================================================

exports.getPendingShooters = async (req, res) => {
    try {

        const shooters =
            await User.find(
                {
                    role: "shooter",
                    status: "pending"
                },
                "-password -documents.data"
            )
            .sort({
                createdAt: -1
            });


        res.json(
            shooters
        );


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


// ============================================================
// GET COMPLETE SHOOTER DETAILS
// ============================================================

exports.getShooterDetails = async (req, res) => {
    try {

        const shooter =
            await User.findOne(
                {
                    _id:
                        req.params.id,

                    role:
                        "shooter"
                },
                "-password"
            );


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter application not found"
            });
        }


        const result =
            shooter.toObject();


        if (result.documents) {

            Object.keys(
                result.documents
            ).forEach(key => {

                if (
                    result.documents[key]
                ) {

                    const doc =
                        result.documents[key];


                    doc.available =
                        !!doc.data ||
                        !!doc.mimeType ||
                        !!doc.originalName;


                    delete doc.data;
                }

            });
        }


        res.json(
            result
        );


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


// ============================================================
// APPROVE SHOOTER
// ============================================================

exports.approveShooter = async (req, res) => {
    try {

        const {
            assignedTimeSlot
        } = req.body;


        if (
            !assignedTimeSlot ||
            typeof assignedTimeSlot !== "string" ||
            !assignedTimeSlot.trim()
        ) {

            return res.status(400).json({
                message:
                    "Start Time and End Time are required"
            });
        }


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
                    "Pending shooter application not found"
            });
        }


        shooter.assignedTimeSlot =
            assignedTimeSlot.trim();


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
                "Shooter approved successfully",

            shooterId:
                shooter.shooterId,

            status:
                shooter.status,

            assignedTimeSlot:
                shooter.assignedTimeSlot

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


// ============================================================
// REJECT SHOOTER
// ============================================================

exports.rejectShooter = async (req, res) => {
    try {

        const {
            reason
        } = req.body;


        if (
            !reason ||
            !reason.trim()
        ) {

            return res.status(400).json({
                message:
                    "Rejection reason is required"
            });
        }


        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter"
            });


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Pending shooter application not found"
            });
        }


        shooter.status =
            "rejected";

        shooter.rejectionReason =
            reason.trim();

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
                "Shooter application rejected",

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


// ============================================================
// GET SHOOTER DOCUMENT
// ============================================================

exports.getShooterDocument = async (req, res) => {
    try {

        const allowedDocuments = [

            "passportPhoto",

            "identityProof",

            "birthCertificate",

            "affidavit",

            "schoolShooterId"

        ];


        const documentName =
            req.params.document;


        if (
            !allowedDocuments.includes(
                documentName
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid document"
            });
        }


        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter"
            });


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        const document =
            shooter.documents?.[
                documentName
            ];


        if (
            !document ||
            !document.data
        ) {

            return res.status(404).json({
                message:
                    "Document not found"
            });
        }


        res.set(
            "Content-Type",
            document.mimeType ||
            "application/octet-stream"
        );


        res.set(
            "Content-Disposition",
            `inline; filename="${document.originalName || documentName}"`
        );


        res.send(
            document.data
        );


    } catch (err) {

        console.error(
            "Get shooter document error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// UPDATE SHOOTER
// ============================================================

exports.updateShooter = async (req, res) => {
    try {

        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter",

                status:
                    "approved"
            });


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        // ====================================================
        // PERSONAL DETAILS
        // ====================================================

        if (
            req.body.firstName !== undefined
        ) {

            shooter.firstName =
                String(
                    req.body.firstName
                ).trim();
        }


        if (
            req.body.lastName !== undefined
        ) {

            shooter.lastName =
                String(
                    req.body.lastName
                ).trim();
        }


        if (
            req.body.fatherName !== undefined
        ) {

            shooter.fatherName =
                String(
                    req.body.fatherName
                ).trim();
        }


        if (
            req.body.motherName !== undefined
        ) {

            shooter.motherName =
                String(
                    req.body.motherName
                ).trim();
        }


        if (
            req.body.gender !== undefined
        ) {

            shooter.gender =
                String(
                    req.body.gender
                ).trim();
        }


        // ====================================================
        // PHONE
        // ====================================================

        if (
            req.body.phone !== undefined
        ) {

            const phone =
                String(
                    req.body.phone
                ).trim();


            shooter.phone =
                phone;


            // Keep old field working
            shooter.mobile =
                phone;
        }


        // ====================================================
        // DATE OF BIRTH
        // ====================================================

        if (
            req.body.dateOfBirth !== undefined
        ) {

            const dateOfBirth =
                String(
                    req.body.dateOfBirth
                ).trim();


            shooter.dateOfBirth =
                dateOfBirth;


            // Keep old field working
            shooter.dob =
                dateOfBirth;
        }


        // ====================================================
        // EMAIL
        // ====================================================

        if (
            req.body.email !== undefined
        ) {

            shooter.email =
                String(
                    req.body.email
                )
                .trim()
                .toLowerCase();
        }


        // ====================================================
        // CLASS
        // ====================================================

        if (
            req.body.class !== undefined
        ) {

            const classValue =
                String(
                    req.body.class
                ).trim();


            // New form field -> existing DB field
            shooter.className =
                classValue;
        }


        // ====================================================
        // SECTION
        // ====================================================

        if (
            req.body.section !== undefined
        ) {

            shooter.section =
                String(
                    req.body.section
                ).trim();
        }


        // ====================================================
        // ADDRESS
        // ====================================================

        if (
            req.body.address !== undefined
        ) {

            shooter.address =
                String(
                    req.body.address
                ).trim();
        }


        // ====================================================
        // SHOOTING DETAILS
        // ====================================================

        if (
            req.body.event !== undefined
        ) {

            shooter.event =
                String(
                    req.body.event
                ).trim();
        }


        if (
            req.body.category !== undefined
        ) {

            shooter.category =
                String(
                    req.body.category
                ).trim();
        }


        // ====================================================
        // KEEP FULL NAME UPDATED
        // ====================================================

        const firstName =
            shooter.firstName || "";

        const lastName =
            shooter.lastName || "";


        shooter.name =
            `${firstName} ${lastName}`
                .trim();


        // ====================================================
        // USERNAME
        // ====================================================

        if (
            req.body.username !== undefined
        ) {

            const username =
                String(
                    req.body.username
                )
                .trim()
                .toLowerCase();


            if (!username) {

                return res.status(400).json({
                    message:
                        "Username is required"
                });
            }


            const existingUser =
                await User.findOne({

                    username,

                    _id: {
                        $ne:
                            shooter._id
                    }

                });


            if (existingUser) {

                return res.status(400).json({
                    message:
                        "Username already exists"
                });
            }


            shooter.username =
                username;
        }


        // ====================================================
        // PASSWORD
        // ====================================================
        // Blank = keep existing password

        if (
            req.body.password &&
            String(
                req.body.password
            ).trim()
        ) {

            shooter.password =
                await bcrypt.hash(
                    String(
                        req.body.password
                    ).trim(),
                    10
                );
        }


        // ====================================================
        // INITIALIZE DOCUMENTS
        // ====================================================

        if (
            !shooter.documents
        ) {

            shooter.documents = {};
        }


        // ====================================================
        // PASSPORT PHOTO
        // ====================================================

        if (
            req.body.passportPhoto &&
            req.body.passportPhoto.data
        ) {

            shooter.documents.passportPhoto = {

                originalName:
                    req.body.passportPhoto.originalName ||
                    "passportPhoto",

                mimeType:
                    req.body.passportPhoto.mimeType ||
                    "image/jpeg",

                size:
                    Number(
                        req.body.passportPhoto.size
                    ) || 0,

                data:
                    convertBase64ToBuffer(
                        req.body.passportPhoto.data
                    )

            };
        }


        // ====================================================
        // OTHER DOCUMENTS
        // ====================================================

        const documentFields = [

            "identityProof",

            "birthCertificate",

            "affidavit",

            "schoolShooterId"

        ];


        for (
            const documentName
            of documentFields
        ) {

            const document =
                req.body[
                    documentName
                ];


            if (
                document &&
                document.data
            ) {

                shooter.documents[
                    documentName
                ] = {

                    originalName:
                        document.originalName ||
                        documentName,

                    mimeType:
                        document.mimeType ||
                        "application/octet-stream",

                    size:
                        Number(
                            document.size
                        ) || 0,

                    data:
                        convertBase64ToBuffer(
                            document.data
                        )

                };
            }
        }


        // ====================================================
        // SAVE
        // ====================================================

        await shooter.save();


        // ====================================================
        // RESPONSE
        // ====================================================

        res.json({

            message:
                "Shooter updated successfully",

            shooter: {

                _id:
                    shooter._id,

                shooterId:
                    shooter.shooterId,

                firstName:
                    shooter.firstName,

                lastName:
                    shooter.lastName,

                fatherName:
                    shooter.fatherName,

                motherName:
                    shooter.motherName,

                gender:
                    shooter.gender,

                phone:
                    shooter.phone,

                dateOfBirth:
                    shooter.dateOfBirth,

                email:
                    shooter.email,

                class:
                    shooter.className,

                section:
                    shooter.section,

                address:
                    shooter.address,

                event:
                    shooter.event,

                category:
                    shooter.category,

                username:
                    shooter.username

            }

        });


    } catch (err) {

        console.error(
            "Update shooter error:",
            err
        );


        if (
            err.code === 11000
        ) {

            return res.status(400).json({
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


// ============================================================
// DELETE SHOOTER
// ============================================================

exports.deleteShooter = async (req, res) => {
    try {

        const shooter =
            await User.findOne({
                _id:
                    req.params.id,

                role:
                    "shooter"
            });


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        const deletedBookings =
            await Booking.deleteMany({
                shooter:
                    shooter._id
            });


        await User.deleteOne({
            _id:
                shooter._id
        });


        res.json({

            message:
                "Shooter profile and all lane bookings deleted successfully",

            deletedBookings:
                deletedBookings.deletedCount || 0

        });


    } catch (err) {

        console.error(
            "Delete shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// ATTENDANCE - SAVE
// ============================================================

exports.saveAttendance = async (req, res) => {
    try {

        const {
            date,
            className,
            records
        } = req.body;


        if (
            !date ||
            !className ||
            !Array.isArray(records)
        ) {

            return res.status(400).json({
                message:
                    "Date, class and attendance records are required"
            });
        }


        const validStatuses =
            new Set([
                "present",
                "absent"
            ]);


        if (
            records.some(
                record =>
                    !record.shooterId ||
                    !validStatuses.has(
                        record.status
                    )
            )
        ) {

            return res.status(400).json({
                message:
                    "Each attendance record needs a shooter and valid status"
            });
        }


        const shooterIds =
            records.map(
                record =>
                    record.shooterId
            );


        const shooters =
            await User.find({
                _id: {
                    $in:
                        shooterIds
                },

                role:
                    "shooter",

                status:
                    "approved",

                className
            });


        if (
            shooters.length !==
            shooterIds.length
        ) {

            return res.status(400).json({
                message:
                    "One or more shooters do not belong to the selected class"
            });
        }


        const statusByShooterId =
            new Map(
                records.map(
                    record => [
                        String(
                            record.shooterId
                        ),
                        record.status
                    ]
                )
            );


        shooters.forEach(
            shooter => {

                const existingRecord =
                    shooter.attendance.find(
                        record =>
                            record.date ===
                            date
                    );


                if (existingRecord) {

                    existingRecord.status =
                        statusByShooterId.get(
                            String(
                                shooter._id
                            )
                        );

                } else {

                    shooter.attendance.push({

                        date,

                        status:
                            statusByShooterId.get(
                                String(
                                    shooter._id
                                )
                            )

                    });
                }

            }
        );


        await Promise.all(
            shooters.map(
                shooter =>
                    shooter.save()
            )
        );


        res.json({

            message:
                "Attendance saved successfully"

        });


    } catch (err) {

        console.error(
            "Save attendance error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// ATTENDANCE - GET
// ============================================================

exports.getAttendance = async (req, res) => {
    try {

        const {
            date,
            className
        } = req.query;


        if (
            !date ||
            !className
        ) {

            return res.status(400).json({
                message:
                    "Date and class are required"
            });
        }


        const shooters =
            await User.find(
                {
                    role:
                        "shooter",

                    status:
                        "approved",

                    className
                },
                "attendance"
            );


        const records =
            shooters.map(
                shooter => {

                    const entry =
                        shooter.attendance.find(
                            record =>
                                record.date ===
                                date
                        );


                    return {

                        shooterId:
                            shooter._id,

                        status:
                            entry
                                ? entry.status
                                : "present"

                    };

                }
            );


        res.json({
            records
        });


    } catch (err) {

        console.error(
            "Get attendance error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// ============================================================
// DAILY SCORE - SAVE
// ============================================================

exports.saveDailyScore = async (req, res) => {
    try {

        const {
            shooterId,
            date,
            series
        } = req.body;


        if (
            !shooterId ||
            !date ||
            !Array.isArray(series)
        ) {

            return res.status(400).json({
                message:
                    "Shooter, date and series scores are required"
            });
        }


        const shooter =
            await User.findOne({
                _id:
                    shooterId,

                role:
                    "shooter",

                status:
                    "approved"
            });


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        const expectedSeries =
            shooter.category === "ISSF"
                ? 6
                : 4;


        if (
            series.length !==
                expectedSeries ||

            series.some(
                score =>
                    !Number.isFinite(
                        Number(score)
                    ) ||
                    Number(score) < 0 ||
                    Number(score) > 100
            )
        ) {

            return res.status(400).json({
                message:
                    `Enter ${expectedSeries} series scores between 0 and 100`
            });
        }


        const cleanSeries =
            series.map(
                Number
            );


        const total =
            cleanSeries.reduce(
                (sum, score) =>
                    sum + score,
                0
            );


        if (
            !Array.isArray(
                shooter.dailyScores
            )
        ) {

            shooter.dailyScores =
                [];
        }


        const existingScore =
            shooter.dailyScores.find(
                score =>
                    score.date ===
                    date
            );


        if (existingScore) {

            existingScore.series =
                cleanSeries;

            existingScore.total =
                total;

        } else {

            shooter.dailyScores.push({

                date,

                series:
                    cleanSeries,

                total

            });
        }


        await shooter.save();


        res.json({

            message:
                "Daily score saved successfully",

            total

        });


    } catch (error) {

        console.error(
            "Save daily score error:",
            error
        );

        res.status(500).json({
            message:
                error.message
        });
    }
};


// ============================================================
// DAILY SCORE - GET
// ============================================================

exports.getDailyScore = async (req, res) => {
    try {

        const shooter =
            await User.findOne(
                {
                    _id:
                        req.params.shooterId,

                    role:
                        "shooter",

                    status:
                        "approved"
                },
                "dailyScores"
            );


        if (!shooter) {

            return res.status(404).json({
                message:
                    "Shooter not found"
            });
        }


        const score =
            (
                shooter.dailyScores ||
                []
            ).find(
                item =>
                    item.date ===
                    req.query.date
            );


        res.json({

            score:
                score || null

        });


    } catch (error) {

        console.error(
            "Get daily score error:",
            error
        );

        res.status(500).json({
            message:
                error.message
        });
    }
};