const User = require("../models/User");
const Booking = require("../models/booking");
const bcrypt = require("bcrypt");


// =====================================================
// CREATE SHOOTER
// =====================================================

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
                message: "Username already exists"
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


// =====================================================
// GET ALL APPROVED SHOOTERS
// =====================================================

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


// =====================================================
// GET SINGLE APPROVED SHOOTER
// =====================================================

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


// =====================================================
// ID APPROVAL - GET PENDING SHOOTERS
// =====================================================

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


// =====================================================
// ID APPROVAL - GET COMPLETE SHOOTER DETAILS
// =====================================================

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


                    if (
                        doc.mimeType ||
                        doc.originalName ||
                        doc.size > 0
                    ) {

                        doc.available =
                            true;

                    } else {

                        doc.available =
                            false;
                    }


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


// =====================================================
// ID APPROVAL - APPROVE SHOOTER
// =====================================================

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


        // =================================================
        // SAVE SELECTED TIME SLOT
        // =================================================

        shooter.assignedTimeSlot =
            assignedTimeSlot.trim();


        // =================================================
        // APPROVE SHOOTER
        // =================================================

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


// =====================================================
// ID APPROVAL - REJECT SHOOTER
// =====================================================

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


// =====================================================
// ID APPROVAL - VIEW DOCUMENT
// =====================================================

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


// =====================================================
// UPDATE SHOOTER
// =====================================================

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


        shooter.name =
            req.body.name;

        shooter.username =
            req.body.username;

        shooter.category =
            req.body.category;

        shooter.event =
            req.body.event;

        shooter.age =
            req.body.age;

        shooter.mobile =
            req.body.mobile;

        shooter.email =
            req.body.email;

        shooter.dob =
            req.body.dob ||
            null;

        shooter.gender =
            req.body.gender;

        shooter.className =
            req.body.className;

        shooter.assignedTimeSlot =
            req.body.assignedTimeSlot;


        if (
            req.body.profilePhoto
        ) {

            shooter.profilePhoto =
                req.body.profilePhoto;
        }


        if (
            req.body.password
        ) {

            shooter.password =
                await bcrypt.hash(
                    req.body.password,
                    10
                );
        }


        await shooter.save();


        res.json({

            message:
                "Shooter updated successfully",

            shooter
        });


    } catch (err) {

        console.error(
            "Update shooter error:",
            err
        );

        res.status(500).json({
            message:
                err.message
        });
    }
};


// =====================================================
// DELETE SHOOTER
// =====================================================
// IMPORTANT:
// Delete the shooter's lane bookings as well.

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


        // =================================================
        // DELETE ALL LANE BOOKINGS OF THIS SHOOTER
        // =================================================

        const deletedBookings =
            await Booking.deleteMany({
                shooter:
                    shooter._id
            });


        // =================================================
        // DELETE SHOOTER
        // =================================================

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


// =====================================================
// ATTENDANCE - SAVE
// =====================================================

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
                _id:
                    {
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


// =====================================================
// ATTENDANCE - GET
// =====================================================

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


// =====================================================
// DAILY SCORE - SAVE
// =====================================================

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


// =====================================================
// DAILY SCORE - GET
// =====================================================

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