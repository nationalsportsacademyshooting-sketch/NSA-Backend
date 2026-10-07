const express = require("express");
const multer = require("multer");

const {
    createNewsEvent,
    getNewsEvents,
    deleteNewsEvent,
    updateNewsEvent,
    getNewsImage,
    getNewsFile
} = require("../controllers/newsController");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const router = express.Router();


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB
    },

    fileFilter: (req, file, cb) => {

        // =================================================
        // IMAGE
        // =================================================

        if (file.fieldname === "image") {

            if (file.mimetype.startsWith("image/")) {
                return cb(null, true);
            }

            return cb(
                new Error("Only image files are allowed for the image.")
            );
        }


        // =================================================
        // DOCUMENT / FILE
        // =================================================

        if (file.fieldname === "file") {

            const allowedTypes = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/plain"
            ];

            if (allowedTypes.includes(file.mimetype)) {
                return cb(null, true);
            }

            return cb(
                new Error(
                    "Only PDF, Word, Excel or text files are allowed."
                )
            );
        }


        // Unknown field
        cb(null, false);
    }
});


// =====================================================
// ADMIN - CREATE NEWS / EVENT
// =====================================================

router.post(
    "/",
    auth,
    admin,
    upload.fields([
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "file",
            maxCount: 1
        }
    ]),
    createNewsEvent
);


// =====================================================
// PUBLIC - GET ALL NEWS / EVENTS
// =====================================================
// No auth here.
// News/Event can be loaded without sending a token.

router.get(
    "/",
    getNewsEvents
);


// =====================================================
// PUBLIC - NEWS IMAGE
// =====================================================
// No auth here.
// Browser can directly load the image URL.

router.get(
    "/:id/image",
    getNewsImage
);


// =====================================================
// PUBLIC - NEWS FILE
// =====================================================
// No auth here.
// Browser can directly open/download the attached file.

router.get(
    "/:id/file",
    getNewsFile
);


// =====================================================
// ADMIN - UPDATE NEWS / EVENT
// =====================================================

router.put(
    "/:id",
    auth,
    admin,
    upload.fields([
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "file",
            maxCount: 1
        }
    ]),
    updateNewsEvent
);


// =====================================================
// ADMIN - DELETE NEWS / EVENT
// =====================================================

router.delete(
    "/:id",
    auth,
    admin,
    deleteNewsEvent
);


// =====================================================
// MULTER / UPLOAD ERROR HANDLER
// =====================================================

router.use((error, req, res, next) => {

    console.log("News upload error:", error);


    // =================================================
    // MULTER ERROR
    // =================================================

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                message: "File is too large. Maximum size is 2 MB."
            });
        }

        return res.status(400).json({
            message: error.message
        });
    }


    // =================================================
    // OTHER UPLOAD ERROR
    // =================================================

    if (error) {

        return res.status(400).json({
            message: error.message
        });
    }


    next();
});


module.exports = router;