import mongoose from "mongoose";
import connectToDatabase from "../lib/db/mongodb";
import Application from "../models/Application";
import Job from "../models/Job";
import Candidate from "../models/Candidate";
import ScreeningResult from "../models/ScreeningResult";

async function verify() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  const candId = "6a82cf1de8b7c2e77983d7bf";
  const flutterJobId = "6a830631368a0e74c4d8a956";

  const app = await Application.findOne({
    $or: [
      { _id: candId, jobId: flutterJobId },
      { candidateId: candId, jobId: flutterJobId },
    ],
  }).lean();

  console.log("Matched Application:", app ? { id: app._id, jobId: app.jobId } : "None");
  if (app) {
    const job = await Job.findById(app.jobId).lean();
    const candidate = await Candidate.findById(app.candidateId).lean();
    const screening = await ScreeningResult.findOne({ applicationId: app._id }).lean();

    console.log("Resolved Job Title:", job?.title);
    console.log("Candidate Name:", candidate?.name);
    console.log("Screening Category:", screening?.category);
    console.log("Match Score:", screening?.overallScore);
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
