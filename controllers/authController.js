const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

function getTokenExpiryDate(rememberMe) {
    return new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
}

function publicUser(user) {
    return {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        profilePhoto: user.profilePhoto || ""
    };
}

// Register
exports.register = async (req, res) => {
    try {
        const { username, password, role, name } = req.body;
        const normalizedUsername = String(username || "").trim();

        const existingUser = await User.findOne({ username: normalizedUsername });

        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username: normalizedUsername,
            password: hashedPassword,
            role,
            name: String(name || normalizedUsername).trim()
        });

        await user.save();

        res.status(201).json({ message: "User created successfully" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login — one active session per account.
exports.login = async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");
        const rememberMe = Boolean(req.body.rememberMe);

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // Initialise security fields for older users.
        if (user.failedAttempts === undefined || user.activeSessionExpiresAt === undefined) {
            user.failedAttempts = user.failedAttempts || 0;
            if (user.activeSessionExpiresAt === undefined) user.activeSessionExpiresAt = null;
            if (user.activeSessionId === undefined) user.activeSessionId = null;
            await user.save();
        }

        // Do NOT reject the login merely because an old activeSessionId exists.
        // Browsers/PWAs can lose local storage, users can clear site data, or a
        // previous device can be abandoned. In those cases the server-side
        // session would otherwise create a false "already logged in" error.
        // The password is verified first, then this login becomes the new active
        // session and the previous token is automatically invalidated. This is
        // the same practical behaviour used by many professional apps: a new
        // successful login safely replaces a stale/old session.

        // Check if account is temporarily locked.
        if (user.lockUntil && user.lockUntil > new Date()) {
            const secondsLeft = Math.ceil((user.lockUntil - new Date()) / 1000);
            return res.status(429).json({
                message: `Too many failed attempts. Please wait ${secondsLeft} seconds.`,
                secondsLeft
            });
        }

        // Lock has expired.
        if (user.lockUntil && user.lockUntil <= new Date()) {
            user.failedAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;

            let lockSeconds = 0;
            if (user.failedAttempts > 5) {
                lockSeconds = Math.min(300, 10 + ((user.failedAttempts - 6) * 5));
                user.lockUntil = new Date(Date.now() + lockSeconds * 1000);
            }

            await user.save();

            if (user.failedAttempts > 5) {
                return res.status(429).json({
                    message: `Too many failed attempts. Please wait ${lockSeconds} seconds.`,
                    secondsLeft: lockSeconds
                });
            }

            return res.status(400).json({ message: "Invalid username or password" });
        }

        user.failedAttempts = 0;
        user.lockUntil = null;

        // A successful login always creates a fresh server-side session.
        // This automatically invalidates any previous device/browser session
        // when the new sessionId is saved below.
        const sessionId = crypto.randomUUID();
        const expiresIn = rememberMe ? "30d" : "1d";
        const sessionExpiresAt = getTokenExpiryDate(rememberMe);

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                sessionId
            },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        user.activeSessionId = sessionId;
        user.activeSessionExpiresAt = sessionExpiresAt;
        await user.save();

        res.json({
            message: "Login Successful",
            token,
            user: publicUser(user),
            sessionExpiresAt: sessionExpiresAt.toISOString()
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: err.message });
    }
};

// Logout — revokes the current account session on the backend.
exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user && (!req.user.sessionId || user.activeSessionId === req.user.sessionId)) {
            user.activeSessionId = null;
            user.activeSessionExpiresAt = null;
            await user.save();
        }

        res.json({ message: "Logged out successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get logged-in user's own profile — admin + shooter.
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password -failedAttempts -lockUntil -activeSessionId -activeSessionExpiresAt");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            id: user._id,
            name: user.name || "",
            username: user.username || "",
            mobile: user.mobile || "",
            email: user.email || "",
            dob: user.dob || "",
            age: user.age ?? "",
            category: user.category || "",
            event: user.event || "",
            gender: user.gender || "",
            className: user.className || "",
            assignedTimeSlot: user.assignedTimeSlot || "",
            profilePhoto: user.profilePhoto || "",
            role: user.role || ""
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update only the currently authenticated user's profile.
// Shooter/admin ownership is enforced here; no user id is accepted from the client.
exports.updateMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const body = req.body || {};
        const allowedFields = [
            "name", "username", "mobile", "email", "dob", "age",
            "gender", "className", "category", "event", "assignedTimeSlot"
        ];

        if (body.username !== undefined) {
            const username = String(body.username).trim();
            if (!username) return res.status(400).json({ message: "Username is required" });

            const duplicate = await User.findOne({
                username,
                _id: { $ne: user._id }
            });

            if (duplicate) {
                return res.status(409).json({ message: "Username already exists" });
            }

            user.username = username;
        }

        for (const field of allowedFields) {
            if (field === "username") continue;
            if (body[field] !== undefined) {
                user[field] = body[field];
            }
        }

        if (body.dob === "" || body.dob === null) user.dob = undefined;
        if (body.age === "") user.age = undefined;

        if (body.password) {
            user.password = await bcrypt.hash(String(body.password), 10);
        }

        if (body.profilePhoto !== undefined) {
            const photo = String(body.profilePhoto || "");

            if (photo && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(photo)) {
                return res.status(400).json({ message: "Profile photo must be a PNG, JPG, WEBP or GIF image." });
            }

            if (photo) {
                const commaIndex = photo.indexOf(",");
                const base64Part = commaIndex >= 0 ? photo.slice(commaIndex + 1) : "";
                const estimatedBytes = Math.floor((base64Part.length * 3) / 4);

                if (estimatedBytes > PROFILE_PHOTO_MAX_BYTES) {
                    return res.status(413).json({ message: "Profile photo is too large. Please choose an image under 2 MB." });
                }
            }

            user.profilePhoto = photo;
        }

        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: publicUser(user)
        });
    } catch (err) {
        console.error("Update my profile error:", err);

        if (err && err.code === 11000) {
            return res.status(409).json({ message: "Username already exists" });
        }

        res.status(500).json({ message: err.message });
    }
};

// Change Admin Username & Password — retained for compatibility.
exports.changeAdmin = async (req, res) => {
    try {
        const { newUsername, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user || user.role !== "admin") {
            return res.status(404).json({ message: "Admin not found" });
        }

        if (newUsername) user.username = String(newUsername).trim();
        if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

        await user.save();

        res.json({ message: "Admin account updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getShooters = async (req, res) => {
    try {
        const shooters = await User.find({ role: "shooter" }, "-password")
            .sort({ name: 1 });
        res.json(shooters);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateShooter = async (req, res) => {
    try {
        const shooter = await User.findById(req.params.id);

        if (!shooter) {
            return res.status(404).json({ message: "Shooter not found" });
        }

        shooter.name = req.body.name;
        shooter.username = req.body.username;
        shooter.category = req.body.category;
        shooter.age = req.body.age;
        shooter.gender = req.body.gender;
        shooter.mobile = req.body.mobile;
        shooter.assignedTimeSlot = req.body.assignedTimeSlot;

        if (req.body.password && req.body.password !== "") {
            shooter.password = await bcrypt.hash(req.body.password, 10);
        }

        await shooter.save();
        res.json({ message: "Shooter updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteShooter = async (req, res) => {
    try {
        const shooter = await User.findById(req.params.id);

        if (!shooter) {
            return res.status(404).json({ message: "Shooter not found" });
        }

        await shooter.deleteOne();
        res.json({ message: "Shooter deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMyAttendance = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({ message: "Shooter access required" });
        }

        const shooter = await User.findById(req.user.id, "name className attendance");
        if (!shooter) return res.status(404).json({ message: "Shooter not found" });

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
            return res.status(403).json({ message: "Shooter access required" });
        }

        const shooter = await User.findById(req.user.id, "name category dailyScores");
        if (!shooter) return res.status(404).json({ message: "Shooter not found" });

        const dailyScores = [...(shooter.dailyScores || [])].sort(
            (first, second) => second.date.localeCompare(first.date)
        );

        res.json({ name: shooter.name, category: shooter.category, dailyScores });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
