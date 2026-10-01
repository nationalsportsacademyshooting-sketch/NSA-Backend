const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

app.set("trust proxy", 1);

// ==============================
// CORS
// ==============================

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
];

const corsOptions = {
    origin: function (origin, callback) {

        // Allow requests without an Origin header
        // such as server-to-server requests and Postman.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS: Origin not allowed"));
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],

    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle browser preflight requests
app.options("*", cors(corsOptions));

// ==============================
// MIDDLEWARE
// ==============================

app.use(express.json({
    limit: "6mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "6mb"
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
const leaveRoutes = require("./routes/leaveRoutes");

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth/forgot-password", loginLimiter);

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/news", newsRoutes);

app.use("/api/results", resultRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/leaves", leaveRoutes);

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