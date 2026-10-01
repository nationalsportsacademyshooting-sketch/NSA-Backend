const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");

const validDate = v =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));


/* =========================================
   GET EVERY DATE BETWEEN TWO DATES
========================================= */

function eachDate(from, to) {

    const out = [];

    const s =
        new Date(`${from}T00:00:00Z`);

    const e =
        new Date(`${to}T00:00:00Z`);

    if (
        Number.isNaN(s.getTime()) ||
        Number.isNaN(e.getTime())
    ) {
        return out;
    }

    for (
        let d = new Date(s);
        d <= e;
        d.setUTCDate(d.getUTCDate() + 1)
    ) {

        out.push(
            d.toISOString().slice(0, 10)
        );

    }

    return out;
}


/* =========================================
   NORMALIZE ATTENDANCE DATE
========================================= */

function normalizeAttendanceDate(value) {

    if (!value) {
        return "";
    }


    /*
     * Already YYYY-MM-DD
     */
    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return value;
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    /*
     * Attendance dates are calendar dates.
     * Use UTC so MongoDB dates such as
     * 2026-10-01T00:00:00.000Z remain
     * 2026-10-01.
     */
    return date
        .toISOString()
        .slice(0, 10);
}


/* =========================================
   APPLY LEAVE TO ATTENDANCE
========================================= */

function applyLeaveAttendance(
    shooter,
    dates
) {

    const dateSet =
        new Set(dates);


    /*
     * Remove an existing "leave" mark
     * for these dates first.
     *
     * This prevents duplicate leave
     * attendance records.
     */
    shooter.attendance =
        (shooter.attendance || []).filter(
            item => {

                const itemDate =
                    normalizeAttendanceDate(
                        item.date
                    );

                const itemStatus =
                    String(
                        item.status || ""
                    )
                        .trim()
                        .toLowerCase();

                return !(
                    itemStatus === "leave" &&
                    dateSet.has(itemDate)
                );

            }
        );


    /*
     * Add leave attendance.
     */
    for (const date of dates) {

        const existing =
            shooter.attendance.find(
                item =>
                    normalizeAttendanceDate(
                        item.date
                    ) === date
            );


        if (existing) {

            existing.status =
                "leave";

        } else {

            shooter.attendance.push({
                date,
                status: "leave"
            });

        }

    }

}


/* =========================================
   REMOVE LEAVE FROM ATTENDANCE
========================================= */

function removeLeaveAttendance(
    shooter,
    dates
) {

    const dateSet =
        new Set(dates);


    shooter.attendance =
        (shooter.attendance || []).filter(
            item => {

                const itemDate =
                    normalizeAttendanceDate(
                        item.date
                    );


                const itemStatus =
                    String(
                        item.status || ""
                    )
                        .trim()
                        .toLowerCase();


                /*
                 * Remove ONLY leave attendance.
                 *
                 * Present and absent records
                 * are not touched.
                 */
                return !(
                    itemStatus === "leave" &&
                    dateSet.has(itemDate)
                );

            }
        );

}


/* =========================================
   CREATE LEAVE
========================================= */

exports.createLeave = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "shooter"
        ) {

            return res.status(403).json({
                message:
                    "Shooter access required"
            });

        }


        const {
            fromDate,
            toDate,
            reason
        } = req.body;


        if (
            !validDate(fromDate) ||
            !validDate(toDate) ||
            !String(reason || "").trim()
        ) {

            return res.status(400).json({
                message:
                    "From date, to date and reason are required."
            });

        }


        if (
            fromDate > toDate
        ) {

            return res.status(400).json({
                message:
                    "From date cannot be after to date."
            });

        }


        const overlap =
            await LeaveRequest.findOne({

                shooter:
                    req.user.id,

                status: {
                    $in: [
                        "pending",
                        "approved"
                    ]
                },

                fromDate: {
                    $lte: toDate
                },

                toDate: {
                    $gte: fromDate
                }

            });


        if (overlap) {

            return res.status(409).json({
                message:
                    "You already have a pending or approved leave for overlapping dates."
            });

        }


        const leave =
            await LeaveRequest.create({

                shooter:
                    req.user.id,

                fromDate,

                toDate,

                reason:
                    String(reason).trim(),

                rejectionReason:
                    ""

            });


        await leave.populate(
            "shooter",
            "name username className"
        );


        res.status(201).json({

            message:
                "Leave application submitted.",

            leave

        });


    } catch (e) {

        console.error(
            "Create leave error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};


/* =========================================
   GET SHOOTER'S LEAVES
========================================= */

exports.getMyLeaves = async (
    req,
    res
) => {

    try {

        if (
            req.user.role !== "shooter"
        ) {

            return res.status(403).json({
                message:
                    "Shooter access required"
            });

        }


        const leaves =
            await LeaveRequest.find({

                shooter:
                    req.user.id

            })
                .sort({
                    fromDate: -1,
                    createdAt: -1
                })
                .lean();


        res.json({
            leaves
        });


    } catch (e) {

        console.error(
            "Get my leaves error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};


/* =========================================
   GET ALL LEAVES - ADMIN
========================================= */

exports.getAllLeaves = async (
    req,
    res
) => {

    try {

        const leaves =
            await LeaveRequest.find()
                .populate(
                    "shooter",
                    "name username className category profilePhoto"
                )
                .populate(
                    "reviewedBy",
                    "name username"
                )
                .sort({
                    status: 1,
                    fromDate: -1,
                    createdAt: -1
                })
                .lean();


        res.json({
            leaves
        });


    } catch (e) {

        console.error(
            "Get all leaves error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};


/* =========================================
   APPROVE / REJECT LEAVE
========================================= */

exports.updateLeaveStatus = async (
    req,
    res
) => {

    try {

        const {
            status,
            rejectionReason
        } = req.body;


        if (
            ![
                "approved",
                "rejected"
            ].includes(status)
        ) {

            return res.status(400).json({
                message:
                    "Invalid leave status."
            });

        }


        const leave =
            await LeaveRequest.findById(
                req.params.id
            );


        if (!leave) {

            return res.status(404).json({
                message:
                    "Leave request not found."
            });

        }


        const reason =
            String(
                rejectionReason || ""
            ).trim();


        if (
            status === "rejected" &&
            !reason
        ) {

            return res.status(400).json({
                message:
                    "A rejection reason is required."
            });

        }


        const shooter =
            await User.findById(
                leave.shooter
            );


        /*
         * If an already approved leave is
         * being changed, remove its old
         * attendance marks first.
         */
        if (
            shooter &&
            leave.status === "approved"
        ) {

            removeLeaveAttendance(
                shooter,
                eachDate(
                    leave.fromDate,
                    leave.toDate
                )
            );

        }


        leave.status =
            status;

        leave.reviewedAt =
            new Date();

        leave.reviewedBy =
            req.user.id;

        leave.rejectionReason =
            status === "rejected"
                ? reason
                : "";


        if (shooter) {

            /*
             * Only approved leave creates
             * leave attendance.
             */
            if (
                status === "approved"
            ) {

                applyLeaveAttendance(
                    shooter,
                    eachDate(
                        leave.fromDate,
                        leave.toDate
                    )
                );

            }


            await shooter.save();

        }


        await leave.save();


        await leave.populate(
            "shooter",
            "name username className"
        );


        res.json({

            message:
                `Leave ${status}.`,

            leave

        });


    } catch (e) {

        console.error(
            "Update leave status error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};


/* =========================================
   ADMIN EDIT LEAVE
========================================= */

exports.updateLeave = async (
    req,
    res
) => {

    try {

        const leave =
            await LeaveRequest.findById(
                req.params.id
            );


        if (!leave) {

            return res.status(404).json({
                message:
                    "Leave request not found."
            });

        }


        const fromDate =
            req.body.fromDate !== undefined
                ? String(
                    req.body.fromDate
                )
                : leave.fromDate;


        const toDate =
            req.body.toDate !== undefined
                ? String(
                    req.body.toDate
                )
                : leave.toDate;


        const reason =
            req.body.reason !== undefined
                ? String(
                    req.body.reason
                ).trim()
                : leave.reason;


        if (
            !validDate(fromDate) ||
            !validDate(toDate) ||
            !reason
        ) {

            return res.status(400).json({
                message:
                    "Valid from date, to date and reason are required."
            });

        }


        if (
            fromDate > toDate
        ) {

            return res.status(400).json({
                message:
                    "From date cannot be after to date."
            });

        }


        /*
         * Check overlap for pending leaves.
         */
        if (
            leave.status === "pending"
        ) {

            const overlap =
                await LeaveRequest.findOne({

                    _id: {
                        $ne: leave._id
                    },

                    shooter:
                        leave.shooter,

                    status: {
                        $in: [
                            "pending",
                            "approved"
                        ]
                    },

                    fromDate: {
                        $lte: toDate
                    },

                    toDate: {
                        $gte: fromDate
                    }

                });


            if (overlap) {

                return res.status(409).json({
                    message:
                        "The edited dates overlap another pending or approved leave."
                });

            }

        }


        /*
         * Save the old dates before changing them.
         */
        const oldDates =
            eachDate(
                leave.fromDate,
                leave.toDate
            );


        /*
         * Check overlap for approved leaves.
         */
        if (
            leave.status === "approved"
        ) {

            const overlap =
                await LeaveRequest.findOne({

                    _id: {
                        $ne: leave._id
                    },

                    shooter:
                        leave.shooter,

                    status:
                        "approved",

                    fromDate: {
                        $lte: toDate
                    },

                    toDate: {
                        $gte: fromDate
                    }

                });


            if (overlap) {

                return res.status(409).json({
                    message:
                        "The edited dates overlap another approved leave."
                });

            }

        }


        leave.fromDate =
            fromDate;

        leave.toDate =
            toDate;

        leave.reason =
            reason;


        const shooter =
            await User.findById(
                leave.shooter
            );


        /*
         * If approved, update the
         * corresponding attendance.
         */
        if (
            shooter &&
            leave.status === "approved"
        ) {

            /*
             * Remove old dates.
             */
            removeLeaveAttendance(
                shooter,
                oldDates
            );


            /*
             * Add new dates.
             */
            applyLeaveAttendance(
                shooter,
                eachDate(
                    fromDate,
                    toDate
                )
            );


            await shooter.save();

        }


        await leave.save();


        await leave.populate(
            "shooter",
            "name username className category profilePhoto"
        );


        res.json({

            message:
                "Leave updated successfully.",

            leave

        });


    } catch (e) {

        console.error(
            "Update leave error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};


/* =========================================
   ADMIN DELETE LEAVE
========================================= */

exports.deleteLeave = async (
    req,
    res
) => {

    try {

        const leave =
            await LeaveRequest.findById(
                req.params.id
            );


        if (!leave) {

            return res.status(404).json({
                message:
                    "Leave request not found."
            });

        }


        /*
         * IMPORTANT:
         *
         * Always remove the leave attendance
         * when the leave itself is deleted.
         *
         * We intentionally DO NOT check:
         *
         *     leave.status === "approved"
         *
         * because an old leave attendance
         * record can still exist even if the
         * leave status has changed.
         */
        const shooter =
            await User.findById(
                leave.shooter
            );


        if (shooter) {

            const leaveDates =
                eachDate(
                    leave.fromDate,
                    leave.toDate
                );


            removeLeaveAttendance(
                shooter,
                leaveDates
            );


            await shooter.save();

        }


        /*
         * Delete the actual leave request.
         */
        await leave.deleteOne();


        res.json({

            message:
                "Leave and its attendance records deleted successfully."

        });


    } catch (e) {

        console.error(
            "Delete leave error:",
            e
        );

        res.status(500).json({
            message: e.message
        });

    }

};