const express = require("express");
const multer = require("multer");

const router = express.Router();

const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

/* =========================================================
   MULTER CONFIGURATION
   Registration documents are temporarily kept in memory
   and then saved by authController.register().
   ========================================================= */

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only JPG, JPEG, PNG and PDF files are allowed."
                )
            );
        }

        cb(null, true);
    }
});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

/*
   Shooter registration
   Requires:
   - passportPhoto
   - identityProof
   - birthCertificate
   - affidavit (optional)
   - schoolShooterId
*/

router.post(
    "/register",

    upload.fields([
        {
            name: "passportPhoto",
            maxCount: 1
        },
        {
            name: "identityProof",
            maxCount: 1
        },
        {
            name: "birthCertificate",
            maxCount: 1
        },
        {
            name: "affidavit",
            maxCount: 1
        },
        {
            name: "schoolShooterId",
            maxCount: 1
        }
    ]),

    authController.register
);


/* Login */

router.post(
    "/login",
    authController.login
);


/* Logout */

router.post(
    "/logout",
    authMiddleware,
    authController.logout
);


/* =========================================================
   CURRENT USER
   ========================================================= */

router.get(
    "/my-profile",
    authMiddleware,
    authController.getMyProfile
);

router.put(
    "/my-profile",
    authMiddleware,
    authController.updateMyProfile
);

router.get(
    "/my-profile/documents/:document",
    authMiddleware,
    authController.getMyProfileDocument
);


/* =========================================================
   SHOOTER PERSONAL DATA
   ========================================================= */

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


/* =========================================================
   ADMIN ACCOUNT
   ========================================================= */

router.put(
    "/change-admin",
    authMiddleware,
    adminMiddleware,
    authController.changeAdmin
);


/* =========================================================
   ADMIN — SHOOTER MANAGEMENT
   ========================================================= */

/*
   Get all shooters
*/

router.get(
    "/shooters",
    authMiddleware,
    adminMiddleware,
    authController.getShooters
);


/*
   Get pending registration requests
*/

router.get(
    "/shooters/pending",
    authMiddleware,
    adminMiddleware,
    authController.getPendingShooters
);


/*
   Get complete details of one shooter
*/

router.get(
    "/shooters/:id",
    authMiddleware,
    adminMiddleware,
    authController.getShooterDetails
);


/*
   Approve shooter registration
*/

router.put(
    "/shooters/:id/approve",
    authMiddleware,
    adminMiddleware,
    authController.approveShooter
);


/*
   Reject shooter registration
*/

router.put(
    "/shooters/:id/reject",
    authMiddleware,
    adminMiddleware,
    authController.rejectShooter
);


/*
   View registration documents
*/

router.get(
    "/shooters/:id/documents/:document",
    authMiddleware,
    adminMiddleware,
    authController.getShooterDocument
);


/*
   Update existing shooter
*/

router.put(
    "/shooters/:id",
    authMiddleware,
    adminMiddleware,
    adminController.updateShooter
);


/*
   Delete shooter
*/

router.delete(
    "/shooters/:id",
    authMiddleware,
    adminMiddleware,
    adminController.deleteShooter
);


/* =========================================================
   MULTER ERROR HANDLER
   ========================================================= */

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                message:
                    "File is too large. Maximum allowed size is 5 MB per file."
            });
        }

        return res.status(400).json({
            message: err.message
        });
    }

    if (err) {
        return res.status(400).json({
            message: err.message
        });
    }

    next();
});


module.exports = router;