import connectToDatabase from "../lib/db/mongodb";

async function verify() {
  process.loadEnvFile(".env");
  console.log("Connecting via connectToDatabase()...");
  const mongoose = await connectToDatabase();
  console.log(" Connected to database:", mongoose.connection.db?.databaseName);
  const collections = await mongoose.connection.db?.listCollections().toArray();
  console.log("Collections:", collections?.map((c) => c.name));
  await mongoose.disconnect();
}

verify().catch(console.error);
