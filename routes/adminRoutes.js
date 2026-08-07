const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");

// Create Shooter
router.post(
    "/create-shooter",
    auth,
    admin,
    adminController.createShooter
);

// Get All Shooters
router.get(
    "/shooters",
    auth,
    admin,
    adminController.getShooters
);

// Get Single Shooter
router.get(
    "/shooter/:id",
    auth,
    admin,
    adminController.getShooter
);

// Update Shooter
router.put(
    "/update-shooter/:id",
    auth,
    admin,
    adminController.updateShooter
);

// Delete Shooter
router.delete(
    "/delete-shooter/:id",
    auth,
    admin,
    adminController.deleteShooter
);

module.exports = router;