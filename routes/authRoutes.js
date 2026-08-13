const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get(
    "/my-profile",
    authMiddleware,
    authController.getMyProfile
);

router.get(
    "/my-attendance",
    authMiddleware,
    authController.getMyAttendance
);
router.get(
    "/my-daily-scores",
    authMiddleware,
    authController.getMyDailyScores
);
router.put(
    "/change-admin",
    authMiddleware,
    adminMiddleware,
    authController.changeAdmin
);

module.exports = router;