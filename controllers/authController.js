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
            currentUsername,
            currentPassword,
            newUsername,
            newPassword
        } = req.body;

        const user = await User.findOne({
            username: currentUsername,
            role: "admin"
        });

        if (!user) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        const match = await bcrypt.compare(currentPassword, user.password);

        if (!match) {
            return res.status(400).json({
                message: "Current password is incorrect"
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