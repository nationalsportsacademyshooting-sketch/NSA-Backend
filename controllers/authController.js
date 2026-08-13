const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register
exports.register = async (req, res) => {
    try {
        const { username, password, role, name } = req.body;

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                message: "Username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            role,
            name
        });

        await user.save();

        res.status(201).json({
            message: "User created successfully"
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// Login
exports.login = async (req, res) => {

    try {

        const { username, password } = req.body;

        const user = await User.findOne({ username });
        
        // Initialize security fields for old users
if (user && user.failedAttempts === undefined) {

    user.failedAttempts = 0;
    user.lockUntil = null;

    await user.save();

}

        // User not found
        if (!user) {

            return res.status(400).json({
                message: "Invalid username or password"
            });

        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > new Date()) {

            const secondsLeft = Math.ceil(
                (user.lockUntil - new Date()) / 1000
            );

            return res.status(429).json({
                message: `Too many failed attempts. Please wait ${secondsLeft} seconds.`,
                secondsLeft
            });

        }

        // Lock has expired, reset security fields
if (user.lockUntil && user.lockUntil <= new Date()) {

    user.failedAttempts = 0;
    user.lockUntil = null;

    await user.save();

}

        const isMatch = await bcrypt.compare(password, user.password);

     // Wrong password
if (!isMatch) {

    user.failedAttempts = (user.failedAttempts || 0) + 1;

    console.log("Failed Attempts:", user.failedAttempts);

    let lockSeconds = 0;

    if (user.failedAttempts > 5) {

        lockSeconds = 10 + ((user.failedAttempts - 6) * 5);

        if (lockSeconds > 300) {
            lockSeconds = 300;
        }

        user.lockUntil = new Date(Date.now() + lockSeconds * 1000);
    }

    await user.save();

    if (user.failedAttempts > 5) {

        return res.status(429).json({
            message: `Too many failed attempts. Please wait ${lockSeconds} seconds.`,
            secondsLeft: lockSeconds
        });

    }

    return res.status(400).json({
        message: "Invalid username or password"
    });

}
        // Successful login
        user.failedAttempts = 0;
        user.lockUntil = null;

        await user.save();

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({

            message: "Login Successful",

            token,

            user: {

                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name

            }

        });

    } catch (err) {

        res.status(500).json({

            message: err.message

        });

    }

};
// Change Admin Username & Password
exports.changeAdmin = async (req, res) => {

    try {

        const {
            newUsername,
            newPassword
        } = req.body;


        // Get admin from JWT token
        const user = await User.findById(req.user.id);


        if (!user) {

            return res.status(404).json({
                message: "Admin not found"
            });

        }


        user.username = newUsername;

        user.password = await bcrypt.hash(newPassword, 10);


        await user.save();


        res.json({
            message: "Admin account updated successfully"
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

        if (req.body.password && req.body.password !== "") {

            shooter.password = await bcrypt.hash(
                req.body.password,
                10
            );

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

// A shooter can only retrieve attendance attached to their own account.
exports.getMyAttendance = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({ message: "Shooter access required" });
        }

        const shooter = await User.findById(
            req.user.id,
            "name className attendance"
        );

        if (!shooter) {
            return res.status(404).json({ message: "Shooter not found" });
        }

        const attendance = [...shooter.attendance].sort(
            (first, second) => second.date.localeCompare(first.date)
        );

        res.json({ name: shooter.name, className: shooter.className, attendance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyDailyScores = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({
                message: "Shooter access required"
            });
        }

        const shooter = await User.findById(
            req.user.id,
            "name category dailyScores"
        );

        if (!shooter) {
            return res.status(404).json({
                message: "Shooter not found"
            });
        }

        const dailyScores = [...(shooter.dailyScores || [])].sort(
            (first, second) => second.date.localeCompare(first.date)
        );

        res.json({
            name: shooter.name,
            category: shooter.category,
            dailyScores
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};