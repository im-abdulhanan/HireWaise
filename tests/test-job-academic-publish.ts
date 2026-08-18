import connectToDatabase from "../lib/db/mongodb";
import Job from "../models/Job";
import JobRequirement from "../models/JobRequirement";
import { Types } from "mongoose";

async function testPublish() {
  process.loadEnvFile(".env");
  await connectToDatabase();

  console.log("Testing Job creation with ACADEMIC_STATUS requirement...");
  const dummyJob = await Job.create({
    companyId: new Types.ObjectId(),
    title: "Test AI Engineer Role",
    slug: `test-academic-job-${Date.now()}`,
    description: "Testing job publication with academic status requirements.",
    status: "PUBLISHED",
    screeningPolicy: {
      requiredSkillsMustMatch: true,
      minimumExperienceMustMatch: true,
      educationRequired: false,
      humanReviewBelowScore: 75,
    },
    scoringWeights: {
      requiredSkillsWeight: 40,
      experienceWeight: 25,
      educationWeight: 15,
      preferredSkillsWeight: 10,
      otherWeight: 10,
    },
  });

  const reqDoc = await JobRequirement.create({
    jobId: dummyJob._id,
    companyId: dummyJob.companyId,
    category: "REQUIRED",
    type: "ACADEMIC_STATUS",
    title: "Final year or Graduate",
    normalizedKey: "academic_status_final_year_or_graduate",
    order: 0,
  });

  console.log("✅ SUCCESS: JobRequirement with ACADEMIC_STATUS created successfully with ID:", reqDoc._id);

  // Clean up test documents
  await JobRequirement.findByIdAndDelete(reqDoc._id);
  await Job.findByIdAndDelete(dummyJob._id);
  console.log("Cleaned up test documents.");
  process.exit(0);
}

testPublish().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
