const User = require("../models/User");
const bcrypt = require("bcrypt");

// Create Shooter
exports.createShooter = async (req, res) => {

    try {

        // Only admin can create shooters
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
            age,
            mobile,
            assignedTimeSlot
        } = req.body;

        // Check username
        const existingUser = await User.findOne({ username });

        if (existingUser) {

            return res.status(400).json({
                message: "Username already exists"
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const shooter = new User({

            name,
            username,
            password: hashedPassword,

            role: "shooter",

            category,
            age,
            mobile,

            assignedTimeSlot

        });

        await shooter.save();

        res.status(201).json({

            message: "Shooter created successfully",
            shooter

        });

    } catch (err) {

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

        const shooter = await User.findById(req.params.id);

        if (!shooter) {

            return res.status(404).json({
                message: "Shooter not found"
            });

        }

        shooter.name = req.body.name;
        shooter.username = req.body.username;
        shooter.category = req.body.category;
        shooter.age = req.body.age;
        shooter.gender = req.body.gender;
        shooter.mobile = req.body.mobile;
        shooter.assignedTimeSlot = req.body.assignedTimeSlot;

        if (req.body.password) {
            shooter.password = await bcrypt.hash(req.body.password, 10);
        }

        await shooter.save();

        res.json({
            message: "Shooter updated successfully"
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

};
exports.deleteShooter = async (req, res) => {

    try {

        const shooter = await User.findById(req.params.id);

        if (!shooter) {

            return res.status(404).json({
                message: "Shooter not found"
            });

        }

        await shooter.deleteOne();

        res.json({
            message: "Shooter deleted successfully"
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

};
// ===============================
// Get All Shooters
// ===============================

exports.getAllShooters = async (req, res) => {
    try {

        const shooters = await User.find({ role: "shooter" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(shooters);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Server Error"
        });

    }
};
exports.deleteShooter = async (req, res) => {

    try{

        await User.findByIdAndDelete(req.params.id);

        res.json({
            message:"Shooter deleted"
        });

    }

    catch(err){

        res.status(500).json({
            message:"Server Error"
        });

    }

};