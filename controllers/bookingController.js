const Booking = require("../models/booking");
const User = require("../models/User");

const TIME_ZONE = "Asia/Kolkata";

function getIndiaDate(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const value = type => parts.find(part => part.type === type).value;
    const date = new Date(Date.UTC(
        Number(value("year")),
        Number(value("month")) - 1,
        Number(value("day")) + offsetDays
    ));

    return date.toISOString().slice(0, 10);
}

function canChangeBooking(date, timeSlot) {
    // Example accepted format: 2:00 PM - 3:00 PM
    const match = String(timeSlot).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return false;

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();

    if (hour === 12) hour = 0;
    if (period === "PM") hour += 12;

    const [year, month, day] = date.split("-").map(Number);
    // India is UTC+05:30. Convert the India session start to a real instant.
    const start = Date.UTC(year, month - 1, day, hour - 5, minute - 30);

    return Date.now() < start - (60 * 60 * 1000);
}

async function getShooter(req) {
    return User.findOne({ _id: req.user.id, role: "shooter" });
}

exports.getMyTomorrowBooking = async (req, res) => {
    try {
        const shooter = await getShooter(req);
        if (!shooter) return res.status(403).json({ message: "Shooter access required" });
        if (!shooter.assignedTimeSlot) {
            return res.status(400).json({ message: "Your admin has not assigned a training time slot." });
        }

        const date = getIndiaDate(1);
        const [booking, occupied] = await Promise.all([
            Booking.findOne({ shooter: shooter._id, date }),
            Booking.find({ date, timeSlot: shooter.assignedTimeSlot }, "laneNumber")
        ]);

        res.json({
            date,
            timeSlot: shooter.assignedTimeSlot,
            booking,
            occupiedLanes: occupied.map(item => item.laneNumber),
            canChange: canChangeBooking(date, shooter.assignedTimeSlot)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.saveMyTomorrowBooking = async (req, res) => {
    try {
        const laneNumber = Number(req.body.laneNumber);
        if (!Number.isInteger(laneNumber) || laneNumber < 1 || laneNumber > 8) {
            return res.status(400).json({ message: "Choose a lane from 1 to 8." });
        }

        const shooter = await getShooter(req);
        if (!shooter) return res.status(403).json({ message: "Shooter access required" });
        if (!shooter.assignedTimeSlot) {
            return res.status(400).json({ message: "Your admin has not assigned a training time slot." });
        }

        const date = getIndiaDate(1);
        if (!canChangeBooking(date, shooter.assignedTimeSlot)) {
            return res.status(403).json({ message: "Lane bookings cannot be changed within one hour of the session." });
        }

        const alreadyTaken = await Booking.findOne({
            date,
            timeSlot: shooter.assignedTimeSlot,
            laneNumber,
            shooter: { $ne: shooter._id }
        });
        if (alreadyTaken) return res.status(409).json({ message: "This lane has already been booked." });

        const booking = await Booking.findOneAndUpdate(
            { shooter: shooter._id, date },
            { timeSlot: shooter.assignedTimeSlot, laneNumber },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ message: "Lane booking saved successfully.", booking });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "This lane was just booked by another shooter. Choose another lane." });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.cancelMyTomorrowBooking = async (req, res) => {
    try {
        const shooter = await getShooter(req);
        if (!shooter) return res.status(403).json({ message: "Shooter access required" });

        const date = getIndiaDate(1);
        if (!canChangeBooking(date, shooter.assignedTimeSlot)) {
            return res.status(403).json({ message: "Lane bookings cannot be cancelled within one hour of the session." });
        }

        const booking = await Booking.findOneAndDelete({ shooter: shooter._id, date });
        if (!booking) return res.status(404).json({ message: "No booking found for tomorrow." });

        res.json({ message: "Lane booking cancelled." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* =========================================================
   ADMIN - EDIT BOOKING
========================================================= */

exports.updateBookingForAdmin = async (req, res) => {
    try {
        const bookingId = req.params.id;

        const date = String(req.body.date || "").trim();
        const timeSlot = String(req.body.timeSlot || "").trim();
        const laneNumber = Number(req.body.laneNumber);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                message: "Enter a valid booking date."
            });
        }

        if (!timeSlot) {
            return res.status(400).json({
                message: "Training time is required."
            });
        }

        if (!Number.isInteger(laneNumber) || laneNumber < 1 || laneNumber > 8) {
            return res.status(400).json({
                message: "Choose a lane from 1 to 8."
            });
        }

        const today = getIndiaDate(0);

        if (date < today) {
            return res.status(400).json({
                message: "Past bookings cannot be edited."
            });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        const laneConflict = await Booking.findOne({
            _id: { $ne: booking._id },
            date,
            timeSlot,
            laneNumber
        });

        if (laneConflict) {
            return res.status(409).json({
                message: "This lane is already booked for that date and time."
            });
        }

        const shooterDateConflict = await Booking.findOne({
            _id: { $ne: booking._id },
            shooter: booking.shooter,
            date
        });

        if (shooterDateConflict) {
            return res.status(409).json({
                message: "This shooter already has a booking on that date."
            });
        }

        booking.date = date;
        booking.timeSlot = timeSlot;
        booking.laneNumber = laneNumber;

        await booking.save();

        const updatedBooking = await Booking.findById(booking._id)
            .populate(
                "shooter",
                "name className category profilePhoto"
            );

        res.json({
            message: "Lane booking updated successfully.",
            booking: updatedBooking
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This booking conflicts with another booking."
            });
        }

        console.error("Admin update booking error:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


/* =========================================================
   ADMIN - CANCEL BOOKING
========================================================= */

exports.cancelBookingForAdmin = async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found."
            });
        }

        res.json({
            message: "Lane booking cancelled successfully."
        });

    } catch (error) {
        console.error("Admin cancel booking error:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


exports.getUpcomingBookingsForAdmin = async (req, res) => {
    try {
        // Get today's date in India
        const today = getIndiaDate(0);

        // Get every booking from today onwards.
        // Past dates are automatically excluded.
        const bookings = await Booking.find({
            date: { $gte: today }
        })
        .populate(
            "shooter",
            "name className category profilePhoto"
        );

        // Convert time slot start time into minutes
        function getStartTime(timeSlot) {
            const match = String(timeSlot).match(
                /(\d{1,2}):(\d{2})\s*(AM|PM)/i
            );

            if (!match) return 9999;

            let hour = Number(match[1]);
            const minute = Number(match[2]);
            const period = match[3].toUpperCase();

            if (hour === 12) {
                hour = 0;
            }

            if (period === "PM") {
                hour += 12;
            }

            return (hour * 60) + minute;
        }

        // Sort by:
        // 1. Booking date
        // 2. Time slot
        // 3. Lane number
        bookings.sort((a, b) => {

            const dateDifference =
                String(a.date).localeCompare(String(b.date));

            if (dateDifference !== 0) {
                return dateDifference;
            }

            const timeDifference =
                getStartTime(a.timeSlot) -
                getStartTime(b.timeSlot);

            if (timeDifference !== 0) {
                return timeDifference;
            }

            return Number(a.laneNumber) -
                   Number(b.laneNumber);
        });

        res.json({
            fromDate: today,
            bookings
        });

    } catch (error) {

        console.error(
            "Upcoming admin bookings error:",
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
};