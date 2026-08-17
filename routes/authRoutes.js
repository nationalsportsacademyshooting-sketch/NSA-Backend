const express = require("express");

const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

router.get("/my-profile", authMiddleware, authController.getMyProfile);
router.put("/my-profile", authMiddleware, authController.updateMyProfile);

router.get("/my-attendance", authMiddleware, authController.getMyAttendance);
router.get("/my-daily-scores", authMiddleware, authController.getMyDailyScores);

router.put("/change-admin", authMiddleware, adminMiddleware, authController.changeAdmin);

module.exports = router;
