const Result = require("../models/result");

// ==============================
// ADMIN — UPLOAD RESULT
// ==============================
exports.createResult = async (req, res) => {
    try {

        const {
            title,
            eventName,
            date,
            fileName,
            fileData,
            contentType
        } = req.body;

        if (
            !title ||
            !eventName ||
            !date ||
            !fileName ||
            !fileData
        ) {
            return res.status(400).json({
                message: "All result details and PDF are required."
            });
        }

        const rawBase64 = String(fileData).replace(/^data:[^;]+;base64,/, "");
        const estimatedBytes = Math.floor((rawBase64.length * 3) / 4);
        if (estimatedBytes > 11 * 1024 * 1024) {
            return res.status(413).json({ message: "PDF is too large. Please upload a PDF smaller than 11 MB." });
        }

        const result = new Result({
            title: title.trim(),
            eventName: eventName.trim(),
            date,
            fileName,
            fileData: Buffer.from(fileData, "base64"),
            contentType: contentType || "application/pdf"
        });

        await result.save();

        res.status(201).json({
            message: "Result uploaded successfully.",
            result: {
                id: result._id,
                title: result.title,
                eventName: result.eventName,
                date: result.date,
                fileName: result.fileName
            }
        });

    } catch (error) {

        console.error("Create result error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};


// ==============================
// ADMIN + SHOOTER — GET RESULTS
// ==============================
exports.getResults = async (req, res) => {
    try {

        const results = await Result.find()
            .select("-fileData")
            .sort({ date: -1, createdAt: -1 });

        res.json({ results });

    } catch (error) {

        console.error("Get results error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};


// ==============================
// VIEW RESULT PDF
// ==============================
exports.viewResult = async (req, res) => {
    try {

        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found."
            });
        }

        res.setHeader(
            "Content-Type",
            result.contentType || "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${result.fileName}"`
        );

        res.send(result.fileData);

    } catch (error) {

        console.error("View result error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};


// ==============================
// DOWNLOAD RESULT PDF
// ==============================
exports.downloadResult = async (req, res) => {
    try {

        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found."
            });
        }

        res.setHeader(
            "Content-Type",
            result.contentType || "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${result.fileName}"`
        );

        res.send(result.fileData);

    } catch (error) {

        console.error("Download result error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};


// ==============================
// ADMIN — DELETE RESULT
// ==============================
exports.deleteResult = async (req, res) => {
    try {

        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found."
            });
        }

        await result.deleteOne();

        res.json({
            message: "Result deleted successfully."
        });

    } catch (error) {

        console.error("Delete result error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};


// ==============================
// ADMIN — UPDATE RESULT
// ==============================
exports.updateResult = async (req, res) => {
    try {

        const result = await Result.findById(req.params.id);

        if (!result) {
            return res.status(404).json({
                message: "Result not found."
            });
        }

        if (req.body.title !== undefined) {
            result.title = req.body.title.trim();
        }

        if (req.body.eventName !== undefined) {
            result.eventName = req.body.eventName.trim();
        }

        if (req.body.date !== undefined) {
            result.date = req.body.date;
        }

        // Replace PDF only if admin selected a new one
        if (req.body.fileData) {
            const rawBase64 = String(req.body.fileData).replace(/^data:[^;]+;base64,/, "");
            const estimatedBytes = Math.floor((rawBase64.length * 3) / 4);
            if (estimatedBytes > 11 * 1024 * 1024) {
                return res.status(413).json({ message: "PDF is too large. Please upload a PDF smaller than 11 MB." });
            }

            result.fileData =
                Buffer.from(req.body.fileData, "base64");

            result.fileName =
                req.body.fileName || result.fileName;

            result.contentType =
                req.body.contentType || "application/pdf";
        }

        await result.save();

        res.json({
            message: "Result updated successfully."
        });

    } catch (error) {

        console.error("Update result error:", error);

        res.status(500).json({
            message: error.message
        });

    }
};