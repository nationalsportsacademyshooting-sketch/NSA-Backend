const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        eventName: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: String,
            required: true
        },

        fileName: {
            type: String,
            required: true
        },

        fileData: {
            type: Buffer,
            required: true
        },

        contentType: {
            type: String,
            required: true,
            default: "application/pdf"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Result", resultSchema);