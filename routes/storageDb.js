const mongoose = require("mongoose");

const secondaryUri = String(process.env.MONGO_URI_2 || "").trim();
const useSecondary = secondaryUri &&
    secondaryUri !== "PASTE_SECOND_MONGODB_CONNECTION_STRING_HERE";

let storageDb;

if (useSecondary) {
    storageDb = mongoose.createConnection(secondaryUri);
    storageDb.on("connected", () => console.log("✅ Storage MongoDB (DB2) connected"));
    storageDb.on("error", (err) => console.error("❌ Storage MongoDB (DB2) error:", err.message));
} else {
    storageDb = mongoose.connection;
    console.warn("⚠️ MONGO_URI_2 is not configured. News/Results are using the primary database until DB2 is configured.");
}

module.exports = storageDb;
