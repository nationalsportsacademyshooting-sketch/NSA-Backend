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