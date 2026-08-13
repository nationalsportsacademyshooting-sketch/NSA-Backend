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

exports.getTomorrowBookingsForAdmin = async (req, res) => {
    try {
        const date = getIndiaDate(1);
        const bookings = await Booking.find({ date })
            .populate("shooter", "name className category profilePhoto")
            .sort({ timeSlot: 1, laneNumber: 1 });

        res.json({ date, bookings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};