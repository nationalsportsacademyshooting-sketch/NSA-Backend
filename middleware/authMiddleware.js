const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // All current sessions must carry a server-tracked sessionId. This
        // intentionally invalidates tokens issued by the old backend so the
        // single-session rule starts cleanly after deployment.
        if (!decoded.sessionId) {
            return res.status(401).json({
                message: "Session format is outdated. Please log in again."
            });
        }

        const user = await User.findById(decoded.id).select("activeSessionId activeSessionExpiresAt role");

        if (!user || user.activeSessionId !== decoded.sessionId) {
            return res.status(401).json({
                message: "This session is no longer active. Please log in again."
            });
        }

        if (user.activeSessionExpiresAt && user.activeSessionExpiresAt <= new Date()) {
            return res.status(401).json({
                message: "Your session has expired. Please log in again."
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
