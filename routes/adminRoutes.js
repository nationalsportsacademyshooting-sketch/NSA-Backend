const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");

// =====================================================
// CREATE SHOOTER
// =====================================================

router.post(
    "/create-shooter",
    auth,
    admin,
    adminController.createShooter
);


// =====================================================
// SHOOTER PROFILE
// Only approved shooters should be returned by
// adminController.getShooters()
// =====================================================

router.get(
    "/shooters",
    auth,
    admin,
    adminController.getShooters
);

router.get(
    "/shooter/:id",
    auth,
    admin,
    adminController.getShooter
);

router.put(
    "/update-shooter/:id",
    auth,
    admin,
    adminController.updateShooter
);

router.delete(
    "/delete-shooter/:id",
    auth,
    admin,
    adminController.deleteShooter
);


// =====================================================
// ID APPROVAL
// =====================================================

// Get all pending shooter registrations
router.get(
    "/id-approval",
    auth,
    admin,
    adminController.getPendingShooters
);

// Get complete pending/approved shooter details
router.get(
    "/id-approval/:id",
    auth,
    admin,
    adminController.getShooterDetails
);

// Approve shooter
router.put(
    "/id-approval/:id/approve",
    auth,
    admin,
    adminController.approveShooter
);

// Reject shooter
router.put(
    "/id-approval/:id/reject",
    auth,
    admin,
    adminController.rejectShooter
);

// View uploaded document
router.get(
    "/id-approval/:id/document/:document",
    auth,
    admin,
    adminController.getShooterDocument
);


// =====================================================
// ATTENDANCE
// =====================================================

router.get(
    "/attendance",
    auth,
    admin,
    adminController.getAttendance
);

router.put(
    "/attendance",
    auth,
    admin,
    adminController.saveAttendance
);


// =====================================================
// DAILY SCORE
// =====================================================

router.get(
    "/daily-score/:shooterId",
    auth,
    admin,
    adminController.getDailyScore
);

router.put(
    "/daily-score",
    auth,
    admin,
    adminController.saveDailyScore
);


module.exports = router;