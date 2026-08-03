const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ MongoDB Connected Successfully");
})
.catch((err) => {
    console.log("❌ MongoDB Error:");
    console.log(err);
});

app.get("/", (req, res) => {
    res.send("Backend Working");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});