const NewsEvent = require("../models/NewsEvent");

// ==============================
// CREATE NEWS / EVENT
// ==============================

exports.createNewsEvent = async (req, res) => {
    try {

        const { title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Title is required."
            });
        }

        let imageUrl = "";
        let fileUrl = "";
        let fileName = "";
        let fileType = "";

        // ==============================
        // IMAGE
        // ==============================

        if (req.files?.image?.[0]) {

            const image = req.files.image[0];

            imageUrl =
                `data:${image.mimetype};base64,${image.buffer.toString("base64")}`;
        }


        // ==============================
        // FILE
        // ==============================

        if (req.files?.file?.[0]) {

            const file = req.files.file[0];

            fileUrl =
                `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

            fileName = file.originalname;
            fileType = file.mimetype;
        }


        // ==============================
        // CREATE DATABASE ENTRY
        // ==============================

        const newsEvent = await NewsEvent.create({

            title: title.trim(),

            description: description || "",

            imageUrl,

            fileUrl,

            fileName,

            fileType,

            published: true

        });


        res.status(201).json({

            message: "News/Event published successfully.",

            newsEvent

        });


    } catch (error) {

        console.log(
            "Create News/Event Error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to create News/Event.",

            error:
                error.message

        });

    }
};


// ==============================
// GET ALL NEWS / EVENTS
// ==============================

exports.getNewsEvents = async (req, res) => {
    try {
        const newsEvents = await NewsEvent.find({ published: true })
            .select("_id title description imageUrl fileUrl fileName fileType published createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean();

        const baseUrl = `${req.protocol}://${req.get("host")}`;

        const lightweight = newsEvents.map(item => ({
            _id: item._id,
            title: item.title,
            description: item.description,
            published: item.published,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            imageUrl: item.imageUrl
                ? `${baseUrl}/api/news/${item._id}/image`
                : "",
            fileUrl: item.fileUrl
                ? `${baseUrl}/api/news/${item._id}/file`
                : "",
            fileName: item.fileName || "",
            fileType: item.fileType || ""
        }));

        res.json(lightweight);
    } catch (error) {
        console.error("Get News/Event Error:", error);
        res.status(500).json({
            message: "Unable to load News & Events."
        });
    }
};


// ==============================
// NEWS IMAGE
// ==============================
exports.getNewsImage = async (req, res) => {
    try {
        const item = await NewsEvent.findById(req.params.id)
            .select("imageUrl")
            .lean();

        if (!item || !item.imageUrl) {
            return res.status(404).end();
        }

        const match = String(item.imageUrl).match(
            /^data:([^;]+);base64,(.+)$/s
        );

        if (!match) {
            return res.status(404).end();
        }

        res.setHeader("Content-Type", match[1]);
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(Buffer.from(match[2], "base64"));
    } catch (error) {
        console.error("News image error:", error);
        res.status(404).end();
    }
};


// ==============================
// NEWS FILE
// ==============================
exports.getNewsFile = async (req, res) => {
    try {
        const item = await NewsEvent.findById(req.params.id)
            .select("fileUrl fileName fileType")
            .lean();

        if (!item || !item.fileUrl) {
            return res.status(404).end();
        }

        const match = String(item.fileUrl).match(
            /^data:([^;]+);base64,(.+)$/s
        );

        if (!match) {
            return res.status(404).end();
        }

        res.setHeader(
            "Content-Type",
            item.fileType || match[1] || "application/octet-stream"
        );
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${String(item.fileName || "document").replace(/"/g, "")}"`
        );
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(Buffer.from(match[2], "base64"));
    } catch (error) {
        console.error("News file error:", error);
        res.status(404).end();
    }
};


// ==============================
// UPDATE NEWS / EVENT
// ==============================
exports.updateNewsEvent = async (req, res) => {
    try {
        const item = await NewsEvent.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: "News/Event not found." });
        }

        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim();
            if (!title) return res.status(400).json({ message: "Title is required." });
            item.title = title;
        }

        if (req.body.description !== undefined) {
            item.description = String(req.body.description);
        }

        if (req.files?.image?.[0]) {
            const image = req.files.image[0];
            item.imageUrl = `data:${image.mimetype};base64,${image.buffer.toString("base64")}`;
        }

        if (req.files?.file?.[0]) {
            const file = req.files.file[0];
            item.fileUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
            item.fileName = file.originalname;
            item.fileType = file.mimetype;
        }

        await item.save();

        res.json({
            message: "News/Event updated successfully.",
            newsEvent: item
        });
    } catch (error) {
        console.error("Update News/Event Error:", error);
        res.status(500).json({ message: "Unable to update News/Event.", error: error.message });
    }
};

// ==============================
// DELETE NEWS / EVENT
// ==============================

exports.deleteNewsEvent = async (req, res) => {

    try {

        const { id } = req.params;

        const deleted =
            await NewsEvent.findByIdAndDelete(id);


        if (!deleted) {

            return res.status(404).json({

                message:
                    "News/Event not found."

            });

        }


        res.json({

            message:
                "News/Event deleted successfully."

        });


    } catch (error) {

        console.log(
            "Delete News/Event Error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to delete News/Event."

        });

    }

};