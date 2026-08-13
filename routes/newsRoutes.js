const express = require("express");
const multer = require("multer");

const {
    createNewsEvent,
    getNewsEvents,
    deleteNewsEvent
} = require("../controllers/newsController");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const router = express.Router();


// ==============================
// MULTER CONFIGURATION
// ==============================

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },

    fileFilter: (req, file, cb) => {

        // Image
        if (file.fieldname === "image") {

            if (file.mimetype.startsWith("image/")) {
                return cb(null, true);
            }

            return cb(
                new Error("Only image files are allowed for the image.")
            );
        }

        // PDF / document
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

        cb(null, false);
    }
});


// ==============================
// ADMIN - CREATE NEWS / EVENT
// ==============================

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


// ==============================
// ADMIN + SHOOTER - GET NEWS
// ==============================

router.get(
    "/",
    auth,
    getNewsEvents
);


// ==============================
// ADMIN - DELETE NEWS / EVENT
// ==============================

router.delete(
    "/:id",
    auth,
    admin,
    deleteNewsEvent
);


// ==============================
// MULTER ERROR HANDLER
// ==============================

router.use((error, req, res, next) => {

    console.log("News upload error:", error);

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                message: "File is too large. Maximum size is 10 MB."
            });
        }

        return res.status(400).json({
            message: error.message
        });
    }

    if (error) {

        return res.status(400).json({
            message: error.message
        });
    }

    next();
});


module.exports = router;