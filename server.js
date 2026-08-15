const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const loginLimiter = rateLimit({

    windowMs: 10 * 60 * 1000, // 10 minutes

    max: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        message: "Too many login attempts. Please try again after 10 minutes."
    }

});

// Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const newsRoutes = require("./routes/newsRoutes");
const resultRoutes = require("./routes/resultRoutes");

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/results", resultRoutes);
const bookingRoutes = require("./routes/bookingRoutes");

app.use("/api/bookings", bookingRoutes)

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ MongoDB Connected Successfully");
})
.catch((err) => {
    console.log("❌ MongoDB Error:");
    console.log(err);
});

// Home Route
app.get("/", (req, res) => {
    res.send("Backend Working");
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});