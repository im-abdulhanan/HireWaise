import { generateJobDescriptionWithGemini } from "../lib/ai/job-generator";

async function testGeneration() {
  process.loadEnvFile(".env");
  console.log("Testing generateJobDescriptionWithGemini...");

  const start = Date.now();
  try {
    const res = await generateJobDescriptionWithGemini({
      jobTitle: "Senior Flutter Developer",
      department: "Mobile Engineering",
      location: "Remote",
      workplaceType: "REMOTE",
      employmentType: "FULL_TIME",
      requirements: [
        { title: "Flutter & Dart", category: "REQUIRED", type: "SKILL", minimumValue: 4 },
        { title: "State Management (Bloc / Riverpod)", category: "REQUIRED", type: "SKILL" },
        { title: "CI/CD & App Store Deployment", category: "PREFERRED", type: "SKILL" },
      ],
    });

    console.log(` SUCCESS in ${Date.now() - start}ms:`);
    console.log("Telemetry:", res.telemetry);
    console.log("\nGenerated Description Preview:\n", res.description.substring(0, 300) + "...\n");
  } catch (err: any) {
    console.error("❌ Generation failed:", err);
    process.exit(1);
  }
}

testGeneration();
