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

// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"

    // If your frontend is deployed online, add its URL here:
    // "https://your-frontend-domain.com"
];

const corsOptions = {
    origin: function (origin, callback) {

        // Allow requests without an Origin header.
        // This includes server-to-server requests and Postman.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log("CORS blocked origin:", origin);

        return callback(
            new Error("CORS: Origin not allowed")
        );
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

// Apply CORS before all API routes.
app.use(cors(corsOptions));

// IMPORTANT:
// Do NOT use:
// app.options("*", cors(corsOptions));
//
// The current Express/router version used by this project
// throws a PathError when "*" is used as the route pattern.
// The cors middleware above already handles preflight requests.

// ======================================================
// BODY PARSING
// ======================================================

app.use(express.json({
    limit: "6mb"
}));

app.use(express.urlencoded({
    extended: true,
    limit: "6mb"
}));

// ======================================================
// LOGIN RATE LIMIT
// ======================================================

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

// ======================================================
// ROUTES
// ======================================================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const newsRoutes = require("./routes/newsRoutes");
const resultRoutes = require("./routes/resultRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

// ======================================================
// RATE-LIMITED AUTH ROUTES
// ======================================================

app.use(
    "/api/auth/login",
    loginLimiter
);

app.use(
    "/api/auth/forgot-password",
    loginLimiter
);

// ======================================================
// API ROUTES
// ======================================================

// Authentication
app.use(
    "/api/auth",
    authRoutes
);

// Admin
app.use(
    "/api/admin",
    adminRoutes
);

// News
app.use(
    "/api/news",
    newsRoutes
);

// Results
app.use(
    "/api/results",
    resultRoutes
);

// Bookings
app.use(
    "/api/bookings",
    bookingRoutes
);

// Leaves
app.use(
    "/api/leaves",
    leaveRoutes
);

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

    res.status(200).send(
        "Backend Working"
    );

});

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API route not found"
    });

});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

    console.error("Server error:", err);

    // Handle CORS errors
    if (
        err &&
        typeof err.message === "string" &&
        err.message.startsWith("CORS:")
    ) {

        return res.status(403).json({
            success: false,
            message: err.message
        });

    }

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });

});

// ======================================================
// MONGODB
// ======================================================

mongoose.connect(process.env.MONGO_URI)

    .then(() => {

        console.log(
            "✅ MongoDB Connected Successfully"
        );

    })

    .catch((err) => {

        console.error(
            "❌ MongoDB Error:"
        );

        console.error(err);

    });

// ======================================================
// SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});