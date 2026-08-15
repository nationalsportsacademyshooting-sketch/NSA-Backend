const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());

app.use(express.json({
    limit: "15mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "15mb"
}));

// ==============================
// LOGIN RATE LIMIT
// ==============================

const loginLimiter = rateLimit({

    windowMs: 10 * 60 * 1000,

    max: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        message:
            "Too many login attempts. Please try again after 10 minutes."
    }

});

// ==============================
// ROUTES
// ==============================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const newsRoutes = require("./routes/newsRoutes");
const resultRoutes = require("./routes/resultRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/news", newsRoutes);

app.use("/api/results", resultRoutes);

app.use("/api/bookings", bookingRoutes);

// ==============================
// MONGODB
// ==============================

mongoose.connect(process.env.MONGO_URI)

.then(() => {

    console.log("✅ MongoDB Connected Successfully");

})

.catch((err) => {

    console.log("❌ MongoDB Error:");
    console.log(err);

});

// ==============================
// HOME
// ==============================

app.get("/", (req, res) => {

    res.send("Backend Working");

});

// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});