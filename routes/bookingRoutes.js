const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const bookingController = require("../controllers/bookingController");

router.get("/upcoming", auth, admin, bookingController.getUpcomingBookingsForAdmin);
router.put("/admin/:id", auth, admin, bookingController.updateBookingForAdmin);
router.delete("/admin/:id", auth, admin, bookingController.cancelBookingForAdmin);
router.get("/my-tomorrow", auth, bookingController.getMyTomorrowBooking);
router.put("/my-tomorrow", auth, bookingController.saveMyTomorrowBooking);
router.delete("/my-tomorrow", auth, bookingController.cancelMyTomorrowBooking);

module.exports = router;