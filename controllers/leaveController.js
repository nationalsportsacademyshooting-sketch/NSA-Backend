const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");

const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

function eachDate(from, to) {
    const out = [];
    const s = new Date(`${from}T00:00:00Z`);
    const e = new Date(`${to}T00:00:00Z`);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return out;

    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        out.push(d.toISOString().slice(0, 10));
    }

    return out;
}

function applyLeaveAttendance(shooter, dates) {
    const dateSet = new Set(dates);

    // Remove existing leave marks for the shooter.
    shooter.attendance = (shooter.attendance || []).filter(
        item => item.status !== "leave" || !dateSet.has(item.date)
    );

    for (const date of dates) {
        const existing = shooter.attendance.find(item => item.date === date);

        if (existing) {
            existing.status = "leave";
        } else {
            shooter.attendance.push({ date, status: "leave" });
        }
    }
}

function removeLeaveAttendance(shooter, dates) {
    const dateSet = new Set(dates);
    shooter.attendance = (shooter.attendance || []).filter(
        item => !(item.status === "leave" && dateSet.has(item.date))
    );
}

exports.createLeave = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({ message: "Shooter access required" });
        }

        const { fromDate, toDate, reason } = req.body;

        if (!validDate(fromDate) || !validDate(toDate) || !String(reason || "").trim()) {
            return res.status(400).json({
                message: "From date, to date and reason are required."
            });
        }

        if (fromDate > toDate) {
            return res.status(400).json({
                message: "From date cannot be after to date."
            });
        }

        const overlap = await LeaveRequest.findOne({
            shooter: req.user.id,
            status: { $in: ["pending", "approved"] },
            fromDate: { $lte: toDate },
            toDate: { $gte: fromDate }
        });

        if (overlap) {
            return res.status(409).json({
                message: "You already have a pending or approved leave for overlapping dates."
            });
        }

        const leave = await LeaveRequest.create({
            shooter: req.user.id,
            fromDate,
            toDate,
            reason: String(reason).trim(),
            rejectionReason: ""
        });

        await leave.populate("shooter", "name username className");
        res.status(201).json({ message: "Leave application submitted.", leave });
    } catch (e) {
        console.error("Create leave error:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.getMyLeaves = async (req, res) => {
    try {
        if (req.user.role !== "shooter") {
            return res.status(403).json({ message: "Shooter access required" });
        }

        const leaves = await LeaveRequest.find({
            shooter: req.user.id
        })
            .sort({ fromDate: -1, createdAt: -1 })
            .lean();

        res.json({ leaves });
    } catch (e) {
        console.error("Get my leaves error:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await LeaveRequest.find()
            .populate("shooter", "name username className category profilePhoto")
            .populate("reviewedBy", "name username")
            .sort({ status: 1, fromDate: -1, createdAt: -1 })
            .lean();

        res.json({ leaves });
    } catch (e) {
        console.error("Get all leaves error:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid leave status." });
        }

        const leave = await LeaveRequest.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ message: "Leave request not found." });
        }

        const reason = String(rejectionReason || "").trim();

        if (status === "rejected" && !reason) {
            return res.status(400).json({
                message: "A rejection reason is required."
            });
        }

        const shooter = await User.findById(leave.shooter);

        // If changing an already-approved leave, remove its old attendance marks first.
        if (shooter && leave.status === "approved") {
            removeLeaveAttendance(shooter, eachDate(leave.fromDate, leave.toDate));
        }

        leave.status = status;
        leave.reviewedAt = new Date();
        leave.reviewedBy = req.user.id;
        leave.rejectionReason = status === "rejected" ? reason : "";

        if (shooter) {
            if (status === "approved") {
                applyLeaveAttendance(shooter, eachDate(leave.fromDate, leave.toDate));
            }

            await shooter.save();
        }

        await leave.save();
        await leave.populate("shooter", "name username className");

        res.json({
            message: `Leave ${status}.`,
            leave
        });
    } catch (e) {
        console.error("Update leave status error:", e);
        res.status(500).json({ message: e.message });
    }
};

// Admin edit leave details.
exports.updateLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ message: "Leave request not found." });
        }

        const fromDate = req.body.fromDate !== undefined
            ? String(req.body.fromDate)
            : leave.fromDate;

        const toDate = req.body.toDate !== undefined
            ? String(req.body.toDate)
            : leave.toDate;

        const reason = req.body.reason !== undefined
            ? String(req.body.reason).trim()
            : leave.reason;

        if (!validDate(fromDate) || !validDate(toDate) || !reason) {
            return res.status(400).json({
                message: "Valid from date, to date and reason are required."
            });
        }

        if (fromDate > toDate) {
            return res.status(400).json({
                message: "From date cannot be after to date."
            });
        }

        if (leave.status === "pending") {
            const overlap = await LeaveRequest.findOne({
                _id: { $ne: leave._id },
                shooter: leave.shooter,
                status: { $in: ["pending", "approved"] },
                fromDate: { $lte: toDate },
                toDate: { $gte: fromDate }
            });

            if (overlap) {
                return res.status(409).json({
                    message: "The edited dates overlap another pending or approved leave."
                });
            }
        }

        const oldDates = eachDate(leave.fromDate, leave.toDate);

        if (leave.status === "approved") {
            const overlap = await LeaveRequest.findOne({
                _id: { $ne: leave._id },
                shooter: leave.shooter,
                status: "approved",
                fromDate: { $lte: toDate },
                toDate: { $gte: fromDate }
            });

            if (overlap) {
                return res.status(409).json({
                    message: "The edited dates overlap another approved leave."
                });
            }
        }

        leave.fromDate = fromDate;
        leave.toDate = toDate;
        leave.reason = reason;

        const shooter = await User.findById(leave.shooter);

        if (shooter && leave.status === "approved") {
            removeLeaveAttendance(shooter, oldDates);
            applyLeaveAttendance(shooter, eachDate(fromDate, toDate));
            await shooter.save();
        }

        await leave.save();
        await leave.populate("shooter", "name username className category profilePhoto");

        res.json({
            message: "Leave updated successfully.",
            leave
        });
    } catch (e) {
        console.error("Update leave error:", e);
        res.status(500).json({ message: e.message });
    }
};

// Admin delete leave.
exports.deleteLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);

        if (!leave) {
            return res.status(404).json({ message: "Leave request not found." });
        }

        if (leave.status === "approved") {
            const shooter = await User.findById(leave.shooter);

            if (shooter) {
                removeLeaveAttendance(shooter, eachDate(leave.fromDate, leave.toDate));
                await shooter.save();
            }
        }

        await leave.deleteOne();

        res.json({ message: "Leave deleted successfully." });
    } catch (e) {
        console.error("Delete leave error:", e);
        res.status(500).json({ message: e.message });
    }
};
