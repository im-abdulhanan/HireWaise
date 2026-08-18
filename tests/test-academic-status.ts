import { calculateDeterministicMatch, evaluateAcademicStatusRequirement } from "../lib/ai/matcher";
import { CandidateResumeExtraction } from "../lib/ai/schemas";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

console.log("===============================================================");
console.log(" 🎓 ACADEMIC STATUS DETERMINISTIC MATCHING TEST SUITE");
console.log("===============================================================\n");

const baseCandidate: CandidateResumeExtraction = {
  candidateName: "Babo",
  email: "babo@example.com",
  phone: "1234567890",
  location: "Islamabad, Pakistan",
  summary: "Aspiring software engineer",
  skills: ["JavaScript", "Python"],
  normalizedSkills: ["javascript", "python"],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: ["English"],
  totalExperienceYears: 0,
  highestDegree: "Bachelor's",
};

// TEST CASE 1: "BS Computer Science — Final Year" -> MATCHED
console.log("=== Case 1: Final Year Candidate vs 'Final year or Graduate' ===");
const candidate1: CandidateResumeExtraction = {
  ...baseCandidate,
  education: [
    {
      institution: "Virtual University of Pakistan",
      degree: "BS Computer Science",
      academicStatus: "FINAL_YEAR",
      academicYearLevel: "Final Year",
      isCompleted: false,
      isCurrent: true,
    },
  ],
};
const res1 = calculateDeterministicMatch({
  candidate: candidate1,
  requirements: [
    {
      id: "req-1",
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(res1.matchedRequirements[0].status === "MATCHED", "Candidate in Final Year evaluates to MATCHED");
assert(
  res1.matchedRequirements[0].evidenceQuote.toLowerCase().includes("final year"),
  "Evidence quote contains 'Final Year'"
);

// TEST CASE 2: "BS Computer Science — Graduated 2025" -> MATCHED
console.log("\n=== Case 2: Graduated Candidate vs 'Final year or Graduate' ===");
const candidate2: CandidateResumeExtraction = {
  ...baseCandidate,
  education: [
    {
      institution: "Virtual University of Pakistan",
      degree: "BS Computer Science",
      graduationYear: "2025",
      academicStatus: "GRADUATED",
      academicYearLevel: "Graduated",
      isCompleted: true,
      isCurrent: false,
    },
  ],
};
const res2 = calculateDeterministicMatch({
  candidate: candidate2,
  requirements: [
    {
      id: "req-2",
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(res2.matchedRequirements[0].status === "MATCHED", "Graduated candidate evaluates to MATCHED");
assert(
  res2.matchedRequirements[0].evidenceQuote.toLowerCase().includes("graduated"),
  "Evidence quote contains 'Graduated'"
);

// TEST CASE 3: "Bachelor of Science from Virtual University" (No status/dates) -> UNCLEAR
console.log("\n=== Case 3: Bachelor Degree with No Date/Status Evidence ===");
const candidate3: CandidateResumeExtraction = {
  ...baseCandidate,
  education: [
    {
      institution: "Virtual University of Pakistan",
      degree: "Bachelor of Science",
      academicStatus: "UNCLEAR",
      academicYearLevel: "",
      isCompleted: false,
      isCurrent: false,
    },
  ],
};
const res3 = calculateDeterministicMatch({
  candidate: candidate3,
  requirements: [
    {
      id: "req-3",
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(
  res3.matchedRequirements[0].status === "UNCLEAR",
  "Bachelor degree without graduation/year evidence evaluates to UNCLEAR (not MATCHED)"
);
assert(
  res3.matchedRequirements[0].reasoning.toLowerCase().includes("does not provide"),
  "Reasoning explains lack of graduation/year evidence"
);

// TEST CASE 4: "BS Computer Science — 1st Year" -> NOT_FOUND
console.log("\n=== Case 4: 1st Year Candidate vs 'Final year or Graduate' ===");
const candidate4: CandidateResumeExtraction = {
  ...baseCandidate,
  education: [
    {
      institution: "Virtual University of Pakistan",
      degree: "BS Computer Science",
      academicStatus: "ENROLLED",
      academicYearLevel: "1st Year",
      isCompleted: false,
      isCurrent: true,
    },
  ],
};
const res4 = calculateDeterministicMatch({
  candidate: candidate4,
  requirements: [
    {
      id: "req-4",
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(res4.matchedRequirements[0].status === "NOT_FOUND", "1st Year candidate evaluates to NOT_FOUND");

// TEST CASE 5: "BS Computer Science — 2nd Year" -> NOT_FOUND
console.log("\n=== Case 5: 2nd Year Candidate vs 'Final year or Graduate' ===");
const candidate5: CandidateResumeExtraction = {
  ...baseCandidate,
  education: [
    {
      institution: "Virtual University of Pakistan",
      degree: "BS Computer Science",
      academicStatus: "ENROLLED",
      academicYearLevel: "2nd Year",
      isCompleted: false,
      isCurrent: true,
    },
  ],
};
const res5 = calculateDeterministicMatch({
  candidate: candidate5,
  requirements: [
    {
      id: "req-5",
      title: "Final year or Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(res5.matchedRequirements[0].status === "NOT_FOUND", "2nd Year candidate evaluates to NOT_FOUND");

// TEST CASE 6: Strict "Graduate" Requirement vs Final Year candidate -> NOT_FOUND
console.log("\n=== Case 6: Final Year Candidate vs Strict 'Graduate' Requirement ===");
const res6 = calculateDeterministicMatch({
  candidate: candidate1,
  requirements: [
    {
      id: "req-6",
      title: "Graduate",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(
  res6.matchedRequirements[0].status === "NOT_FOUND",
  "Final Year candidate does NOT match strict 'Graduate' requirement"
);

// TEST CASE 7: Strict "Final year" Requirement vs Graduated candidate -> NOT_FOUND
console.log("\n=== Case 7: Graduated Candidate vs Strict 'Final year' Requirement ===");
const res7 = calculateDeterministicMatch({
  candidate: candidate2,
  requirements: [
    {
      id: "req-7",
      title: "Final year",
      category: "REQUIRED",
      type: "ACADEMIC_STATUS",
    },
  ],
});
assert(
  res7.matchedRequirements[0].status === "NOT_FOUND",
  "Graduated candidate does NOT match strict 'Final year' requirement"
);

console.log("\n===============================================================");
console.log(" ✅ ALL 7 ACADEMIC STATUS TESTS PASSED SUCCESSFULLY!");
console.log("===============================================================");
