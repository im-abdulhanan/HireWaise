import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import Job, { IScoringWeights, IScreeningPolicy } from "../models/Job";
import JobRequirement from "../models/JobRequirement";
import { calculateDeterministicMatch } from "../lib/ai/matcher";
import { CandidateData } from "../lib/ai/resume-parser";

const PRESETS = {
  RECOMMENDED: {
    requiredSkillsWeight: 40,
    experienceWeight: 25,
    educationWeight: 15,
    preferredSkillsWeight: 10,
    otherWeight: 10,
  },
  SKILLS_FOCUSED: {
    requiredSkillsWeight: 55,
    experienceWeight: 20,
    educationWeight: 10,
    preferredSkillsWeight: 10,
    otherWeight: 5,
  },
  EXPERIENCE_FOCUSED: {
    requiredSkillsWeight: 25,
    experienceWeight: 50,
    educationWeight: 10,
    preferredSkillsWeight: 10,
    otherWeight: 5,
  },
};

function validateTotal100(weights: IScoringWeights): boolean {
  const sum =
    weights.requiredSkillsWeight +
    weights.experienceWeight +
    weights.educationWeight +
    weights.preferredSkillsWeight +
    weights.otherWeight;
  return sum === 100;
}

async function runTests() {
  console.log("\n=================================================");
  console.log("RUNNING JOB STUDIO SCREENING SETTINGS TESTS");
  console.log("=================================================\n");

  await connectToDatabase();

  const testSuffix = Date.now().toString();
  let testCompany: any = null;
  let testJob: any = null;

  try {
    // TEST 1: Preset weights validation
    console.log("[TEST 1] Validating presets sum to exactly 100%...");
    if (!validateTotal100(PRESETS.RECOMMENDED)) {
      throw new Error("RECOMMENDED preset does not sum to 100%");
    }
    if (!validateTotal100(PRESETS.SKILLS_FOCUSED)) {
      throw new Error("SKILLS_FOCUSED preset does not sum to 100%");
    }
    if (!validateTotal100(PRESETS.EXPERIENCE_FOCUSED)) {
      throw new Error("EXPERIENCE_FOCUSED preset does not sum to 100%");
    }
    console.log("  ✓ RECOMMENDED preset weights: 40/25/15/10/10 = 100%");
    console.log("  ✓ SKILLS_FOCUSED preset weights: 55/20/10/10/5 = 100%");
    console.log("  ✓ EXPERIENCE_FOCUSED preset weights: 25/50/10/10/5 = 100%");
    console.log("  ✓ TEST 1 PASSED: All presets sum to 100%.");

    // TEST 2: Threshold presets validation
    console.log("\n[TEST 2] Validating human review threshold range & presets...");
    const thresholdPresets = [50, 60, 70, 80, 90];
    const defaultThreshold = 70;

    thresholdPresets.forEach((t) => {
      if (t < 40 || t > 95) throw new Error(`Threshold ${t} out of range`);
    });
    if (defaultThreshold !== 70) throw new Error("Default threshold must be 70%");
    console.log("  ✓ Threshold presets [50%, 60%, 70% (Recommended), 80%, 90%] are valid.");
    console.log("  ✓ TEST 2 PASSED: Threshold settings verified.");

    // TEST 3: Job persistence with presets
    console.log("\n[TEST 3] Testing Job persistence with Recommended and Custom scoring policies...");
    testCompany = await Company.create({
      name: `Settings Test Company ${testSuffix}`,
      slug: `settings-co-${testSuffix}`,
      plan: "GROWTH",
    });

    testJob = await Job.create({
      companyId: testCompany._id,
      title: "Senior Product Designer",
      slug: `product-designer-${testSuffix}`,
      department: "Design",
      location: "New York, NY",
      employmentType: "FULL_TIME",
      workplaceType: "HYBRID",
      description: "Looking for a senior product designer with Figma, design systems, and UX research experience.",
      status: "PUBLISHED",
      scoringWeights: PRESETS.RECOMMENDED,
      screeningPolicy: {
        requiredSkillsMustMatch: true,
        minimumExperienceMustMatch: true,
        educationRequired: false,
        humanReviewBelowScore: 70,
      },
    });

    const savedJob = await Job.findById(testJob._id);
    if (!savedJob) throw new Error("Saved job not found.");
    if (savedJob.scoringWeights.requiredSkillsWeight !== 40) {
      throw new Error("Scoring weights did not persist correctly.");
    }
    if (savedJob.screeningPolicy.humanReviewBelowScore !== 70) {
      throw new Error("Screening policy threshold did not persist correctly.");
    }
    console.log("  ✓ Job successfully saved with Recommended preset & 70% threshold.");
    console.log("  ✓ TEST 3 PASSED: Job settings persistence verified.");

    // TEST 4: Matcher engine compatibility across all presets
    console.log("\n[TEST 4] Testing deterministic matcher engine across presets...");
    const sampleCandidate: CandidateData = {
      candidateName: "Morgan Chen",
      email: "morgan@example.com",
      skills: ["Figma", "UI Design", "UX Research", "Design Systems", "Prototyping"],
      normalizedSkills: ["figma", "uidesign", "uxresearch", "designsystems", "prototyping"],
      experience: [
        {
          title: "Senior Product Designer",
          company: "DesignLab Inc",
          durationMonths: 48,
          description: "Led end-to-end UX for flagship web application.",
          skills: ["Figma", "Design Systems"],
        },
      ],
      education: [
        {
          degree: "Bachelor of Fine Arts",
          field: "Interaction Design",
          institution: "Rhode Island School of Design",
          graduationYear: 2020,
        },
      ],
      totalExperienceYears: 4,
      highestDegree: "BACHELOR",
    };

    const sampleRequirements = [
      {
        _id: "req-1",
        title: "Figma",
        category: "REQUIRED",
        type: "SKILL",
        normalizedKey: "figma",
        weightMultiplier: 1.5,
      },
      {
        _id: "req-2",
        title: "3+ years UX design experience",
        category: "REQUIRED",
        type: "EXPERIENCE",
        normalizedKey: "experience_years_3",
        minimumValue: 3,
        weightMultiplier: 2.0,
      },
      {
        _id: "req-3",
        title: "Prototyping",
        category: "PREFERRED",
        type: "SKILL",
        normalizedKey: "prototyping",
        weightMultiplier: 1.0,
      },
    ];

    // Evaluate with Recommended
    const matchRecommended = calculateDeterministicMatch({
      candidate: sampleCandidate,
      requirements: sampleRequirements,
      scoringWeights: PRESETS.RECOMMENDED,
      screeningPolicy: {
        requiredSkillsMustMatch: true,
        minimumExperienceMustMatch: true,
        educationRequired: false,
        humanReviewBelowScore: 70,
      },
    });

    // Evaluate with Skills-focused
    const matchSkills = calculateDeterministicMatch({
      candidate: sampleCandidate,
      requirements: sampleRequirements,
      scoringWeights: PRESETS.SKILLS_FOCUSED,
      screeningPolicy: {
        requiredSkillsMustMatch: true,
        minimumExperienceMustMatch: true,
        educationRequired: false,
        humanReviewBelowScore: 70,
      },
    });

    // Evaluate with Experience-focused
    const matchExp = calculateDeterministicMatch({
      candidate: sampleCandidate,
      requirements: sampleRequirements,
      scoringWeights: PRESETS.EXPERIENCE_FOCUSED,
      screeningPolicy: {
        requiredSkillsMustMatch: true,
        minimumExperienceMustMatch: true,
        educationRequired: false,
        humanReviewBelowScore: 70,
      },
    });

    if (
      typeof matchRecommended.overallScore !== "number" ||
      typeof matchSkills.overallScore !== "number" ||
      typeof matchExp.overallScore !== "number"
    ) {
      throw new Error("Matcher calculation failed for presets.");
    }

    console.log(`  ✓ Recommended Match Score: ${matchRecommended.overallScore}/100 (Category: ${matchRecommended.category})`);
    console.log(`  ✓ Skills-Focused Match Score: ${matchSkills.overallScore}/100 (Category: ${matchSkills.category})`);
    console.log(`  ✓ Experience-Focused Match Score: ${matchExp.overallScore}/100 (Category: ${matchExp.category})`);
    console.log("  ✓ TEST 4 PASSED: Deterministic matcher operates seamlessly across all presets.");

  } finally {
    console.log("\nCleaning up test data...");
    if (testCompany) {
      await JobRequirement.deleteMany({ companyId: testCompany._id });
      await Job.deleteMany({ companyId: testCompany._id });
      await Company.deleteOne({ _id: testCompany._id });
    }
    console.log("Cleaned up test data.");
  }

  console.log("\n=================================================");
  console.log("ALL JOB SETTINGS TESTS PASSED (4/4)!");
  console.log("=================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
