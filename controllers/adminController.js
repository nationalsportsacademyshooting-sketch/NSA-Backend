const User = require("../models/User");
const bcrypt = require("bcrypt");

// Create Shooter
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

        const existingUser = await User.findOne({ username });

        if (existingUser) {

            return res.status(400).json({
                message: "Username already exists"
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const shooter = new User({

            name,
            username,
            password: hashedPassword,

            role: "shooter",

            category,
            event,

            age,
            mobile,
            email,

            dob,

            gender,

            className,

            assignedTimeSlot,

            profilePhoto: profilePhoto || ""

        });

        await shooter.save();

        res.status(201).json({

            message: "Shooter created successfully",

            shooter

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });

    }

};
exports.getShooters = async (req, res) => {

    try {

        const shooters = await User.find(
            { role: "shooter" },
            "-password"
        ).sort({ name: 1 });

        res.json(shooters);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

};
exports.getShooter = async (req, res) => {

    try {

        const shooter = await User.findById(
            req.params.id,
            "-password"
        );

        if (!shooter) {

            return res.status(404).json({
                message: "Shooter not found"
            });

        }

        res.json(shooter);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

};

exports.updateShooter = async (req, res) => {

    try {

        const shooter =
            await User.findById(req.params.id);

        if (!shooter) {

            return res.status(404).json({
                message: "Shooter not found"
            });

        }

        // ==========================
        // UPDATE BASIC DETAILS
        // ==========================

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
            req.body.dob || null;

        shooter.gender =
            req.body.gender;

        shooter.className =
            req.body.className;

        shooter.assignedTimeSlot =
            req.body.assignedTimeSlot;

        // ==========================
        // UPDATE PHOTO
        // ==========================

        if (req.body.profilePhoto) {

            shooter.profilePhoto =
                req.body.profilePhoto;

        }

        // ==========================
        // UPDATE PASSWORD
        // ==========================

        if (req.body.password) {

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

        console.error(err);

        res.status(500).json({
            message: err.message
        });

    }

};
// Delete Shooter
exports.deleteShooter = async (req, res) => {

    try {

        const shooter = await User.findOneAndDelete({
            _id: req.params.id,
            role: "shooter"
        });

        if (!shooter) {

            return res.status(404).json({
                message: "Shooter not found"
            });

        }

        res.json({
            message: "Shooter profile deleted successfully"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: err.message
        });

    }

};

// Save attendance for every shooter in one selected class and date.
exports.saveAttendance = async (req, res) => {

    try {

        const { date, className, records } = req.body;

        if (!date || !className || !Array.isArray(records)) {
            return res.status(400).json({
                message: "Date, class and attendance records are required"
            });
        }

        const validStatuses = new Set(["present", "absent"]);

        if (records.some(record =>
            !record.shooterId || !validStatuses.has(record.status)
        )) {
            return res.status(400).json({
                message: "Each attendance record needs a shooter and valid status"
            });
        }

        const shooterIds = records.map(record => record.shooterId);
        const shooters = await User.find({
            _id: { $in: shooterIds },
            role: "shooter",
            className
        });

        if (shooters.length !== shooterIds.length) {
            return res.status(400).json({
                message: "One or more shooters do not belong to the selected class"
            });
        }

        const statusByShooterId = new Map(
            records.map(record => [String(record.shooterId), record.status])
        );

        shooters.forEach(shooter => {
            const existingRecord = shooter.attendance.find(
                record => record.date === date
            );

            if (existingRecord) {
                existingRecord.status = statusByShooterId.get(String(shooter._id));
            } else {
                shooter.attendance.push({
                    date,
                    status: statusByShooterId.get(String(shooter._id))
                });
            }
        });

        await Promise.all(shooters.map(shooter => shooter.save()));

        res.json({
            message: "Attendance saved successfully"
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ message: err.message });

    }

};

// Load the already-saved statuses for a selected class and date.
exports.getAttendance = async (req, res) => {

    try {

        const { date, className } = req.query;

        if (!date || !className) {
            return res.status(400).json({
                message: "Date and class are required"
            });
        }

        const shooters = await User.find(
            { role: "shooter", className },
            "attendance"
        );

        const records = shooters.map(shooter => {
            const entry = shooter.attendance.find(record => record.date === date);

            return {
                shooterId: shooter._id,
                status: entry ? entry.status : "present"
            };
        });

        res.json({ records });

    } catch (err) {

        res.status(500).json({ message: err.message });

    }

};

exports.saveDailyScore = async (req, res) => {
    try {
        const { shooterId, date, series } = req.body;

        if (!shooterId || !date || !Array.isArray(series)) {
            return res.status(400).json({
                message: "Shooter, date and series scores are required"
            });
        }

        const shooter = await User.findOne({
            _id: shooterId,
            role: "shooter"
        });

        if (!shooter) {
            return res.status(404).json({
                message: "Shooter not found"
            });
        }

        const expectedSeries =
            shooter.category === "ISSF" ? 6 : 4;

        if (
            series.length !== expectedSeries ||
            series.some(score =>
                !Number.isFinite(Number(score)) ||
                Number(score) < 0 ||
                Number(score) > 100
            )
        ) {
            return res.status(400).json({
                message: `Enter ${expectedSeries} series scores between 0 and 100`
            });
        }

        const cleanSeries = series.map(Number);
        const total = cleanSeries.reduce(
            (sum, score) => sum + score,
            0
        );

        const existingScore = shooter.dailyScores.find(
            score => score.date === date
        );

        if (existingScore) {
            existingScore.series = cleanSeries;
            existingScore.total = total;
        } else {
            shooter.dailyScores.push({
                date,
                series: cleanSeries,
                total
            });
        }

        await shooter.save();

        res.json({
            message: "Daily score saved successfully",
            total
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDailyScore = async (req, res) => {
    try {
        const shooter = await User.findById(
            req.params.shooterId,
            "dailyScores"
        );

        if (!shooter) {
            return res.status(404).json({
                message: "Shooter not found"
            });
        }

        const score = shooter.dailyScores.find(
            item => item.date === req.query.date
        );

        res.json({ score: score || null });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};