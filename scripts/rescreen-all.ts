import mongoose from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import Application from "../models/Application";
import Candidate from "../models/Candidate";
import ScreeningResult from "../models/ScreeningResult";
import { runScreeningPipeline } from "../lib/ai/screening-pipeline";

async function rescreenAll() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  const applications = await Application.find({});
  console.log(`Found ${applications.length} total applications to screen.`);

  for (const app of applications) {
    const candidate = await Candidate.findById(app.candidateId);
    console.log(`\nRe-screening Application: ${app._id} for Candidate: "${candidate?.name || 'Unknown'}" (${candidate?.email})`);
    
    try {
      const result = await runScreeningPipeline({
        applicationId: app._id.toString(),
      });
      console.log(`Result: Success=${result.success}, Score=${result.overallScore}, Category=${result.category}`);
    } catch (err: any) {
      console.error(`Re-screening failed for ${app._id}:`, err?.message);
    }
  }

  const finalResults = await ScreeningResult.find({});
  console.log(`\nTotal Screening Results in DB: ${finalResults.length}`);

  await mongoose.disconnect();
}

rescreenAll().catch(console.error);
