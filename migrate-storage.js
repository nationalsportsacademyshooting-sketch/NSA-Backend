require("dotenv").config();
const mongoose = require("mongoose");

const primaryUri = String(process.env.MONGO_URI || "").trim();
const secondaryUri = String(process.env.MONGO_URI_2 || "").trim();

if (!primaryUri) {
    console.error("MONGO_URI is not configured.");
    process.exit(1);
}

if (
    !secondaryUri ||
    secondaryUri === "PASTE_SECOND_MONGODB_CONNECTION_STRING_HERE"
) {
    console.error("MONGO_URI_2 is not configured. Put the second MongoDB connection string in .env first.");
    process.exit(1);
}

async function copyCollection(sourceDb, targetDb, name) {
    const source = sourceDb.collection(name);
    const target = targetDb.collection(name);

    const docs = await source.find({}).toArray();

    if (!docs.length) {
        console.log(`ℹ️ ${name}: nothing to copy.`);
        return 0;
    }

    for (const doc of docs) {
        // Upsert by the original _id. This copies data without deleting
        // anything from the first database and is safe to run again.
        await target.replaceOne(
            { _id: doc._id },
            doc,
            { upsert: true }
        );
    }

    console.log(`✅ ${name}: copied ${docs.length} document(s) to DB2.`);
    return docs.length;
}

async function main() {
    const primary = await mongoose.createConnection(primaryUri).asPromise();
    const secondary = await mongoose.createConnection(secondaryUri).asPromise();

    try {
        console.log("Starting copy-only migration. DB1 will NOT be modified.");

        await copyCollection(primary.db, secondary.db, "newsevents");
        await copyCollection(primary.db, secondary.db, "results");

        console.log("✅ Migration completed. No records were deleted from DB1.");
    } finally {
        await primary.close();
        await secondary.close();
    }
}

main().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
