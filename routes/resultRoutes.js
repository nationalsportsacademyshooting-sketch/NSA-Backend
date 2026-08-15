const express = require("express");

const router = express.Router();

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

const resultController =
    require("../controllers/resultController");


// ==============================
// GET ALL RESULTS
// Admin + Shooter
// ==============================
router.get("/my-results", auth, resultController.getResults);

router.get(
    "/",
    auth,
    resultController.getResults
);


// ==============================
// UPLOAD RESULT
// ADMIN ONLY
// ==============================

router.post(
    "/",
    auth,
    admin,
    resultController.createResult
);


// ==============================
// VIEW PDF
// Admin + Shooter
// ==============================

router.get(
    "/:id/view",
    auth,
    resultController.viewResult
);


// ==============================
// DOWNLOAD PDF
// Admin + Shooter
// ==============================

router.get(
    "/:id/download",
    auth,
    resultController.downloadResult
);


// ==============================
// UPDATE RESULT
// ADMIN ONLY
// ==============================

router.put(
    "/:id",
    auth,
    admin,
    resultController.updateResult
);


// ==============================
// DELETE RESULT
// ADMIN ONLY
// ==============================

router.delete(
    "/:id",
    auth,
    admin,
    resultController.deleteResult
);


module.exports = router;