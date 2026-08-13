const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    shooter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    laneNumber: { type: Number, required: true, min: 1, max: 8 }
}, { timestamps: true });

// A lane can only be booked once for one date and time slot.
bookingSchema.index({ date: 1, timeSlot: 1, laneNumber: 1 }, { unique: true });
// A shooter may hold only one lane booking per date.
bookingSchema.index({ shooter: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);