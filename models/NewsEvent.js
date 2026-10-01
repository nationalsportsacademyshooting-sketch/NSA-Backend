const mongoose = require("mongoose");
const storageDb = require("../storageDb");

const newsEventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        imageUrl: {
            type: String,
            default: ""
        },

        fileUrl: {
            type: String,
            default: ""
        },

        fileName: {
            type: String,
            default: ""
        },

        fileType: {
            type: String,
            default: ""
        },

        published: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

newsEventSchema.index({ published: 1, createdAt: -1 });

module.exports = storageDb.models.NewsEvent || storageDb.model("NewsEvent", newsEventSchema);