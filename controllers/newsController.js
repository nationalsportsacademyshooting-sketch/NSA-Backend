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

        const newsEvents =
            await NewsEvent.find({
                published: true
            })
            .sort({
                createdAt: -1
            });

        res.json(newsEvents);

    } catch (error) {

        console.log(
            "Get News/Event Error:",
            error
        );

        res.status(500).json({

            message:
                "Unable to load News & Events."

        });

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