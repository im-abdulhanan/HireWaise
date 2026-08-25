import {
  stripMarkdown,
  parseJobDescription,
  formatStructuredDescriptionAsText,
  StructuredJobDescription,
} from "../lib/jobs/description-parser";

async function runJobDescriptionTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING STRUCTURED JOB DESCRIPTION TESTS");
  console.log("==================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      testFailed++;
    }
  }

  // --- TEST SUITE 1: Markdown Stripping Utility ---
  console.log("🧹 Test Suite 1: Markdown Syntax Stripping");
  const rawHeaders = "### Role Overview\n## Key Duties\n# Summary";
  assert(!stripMarkdown(rawHeaders).includes("#"), "Headers (#, ##, ###) stripped cleanly");

  const rawBold = "**Backend Architecture**: **Design** and develop **scalable** APIs.";
  const cleanBold = stripMarkdown(rawBold);
  assert(
    !cleanBold.includes("**") && cleanBold === "Backend Architecture: Design and develop scalable APIs.",
    "Bold asterisks (**) stripped cleanly"
  );

  const rawBullets = "* First bullet\n- Second bullet\n+ Third bullet";
  const cleanBullets = stripMarkdown(rawBullets);
  assert(
    !cleanBullets.startsWith("*") && !cleanBullets.startsWith("-") && !cleanBullets.startsWith("+"),
    "Markdown bullet markers (*, -, +) stripped cleanly"
  );

  // --- TEST SUITE 2: Structured JSON Object Parsing ---
  console.log("\n📦 Test Suite 2: Structured JSON Object Normalization");
  const mockStructured: StructuredJobDescription = {
    overview: "HireWise is seeking a Senior Backend Engineer to lead API development.",
    responsibilities: [
      {
        title: "Backend Architecture & API Development",
        description: "Design, develop and maintain secure microservices.",
      },
      {
        title: "Database Performance & Scaling",
        description: "Optimize MongoDB indexing and caching layers.",
      },
    ],
    requiredQualifications: [
      {
        title: "Node.js",
        description: "5+ years of backend development experience.",
      },
      {
        title: "Education",
        description: "Bachelor's degree in Computer Science or related field.",
      },
    ],
    preferredQualifications: ["Experience with Docker", "Knowledge of AWS"],
    benefits: ["Competitive salary", "Health coverage"],
  };

  const parsedFromObj = parseJobDescription(mockStructured);
  assert(parsedFromObj.overview.includes("HireWise is seeking"), "Overview preserved from object");
  assert(parsedFromObj.responsibilities.length === 2, "Responsibilities array length = 2");
  assert(
    parsedFromObj.responsibilities[0].title === "Backend Architecture & API Development",
    "Responsibility title matches exactly"
  );
  assert(parsedFromObj.requiredQualifications.length === 2, "Required qualifications length = 2");
  assert(parsedFromObj.preferredQualifications.length === 2, "Preferred qualifications length = 2");
  assert(parsedFromObj.benefits.length === 2, "Benefits array length = 2");

  // --- TEST SUITE 3: Stringified JSON & Fenced JSON Parsing ---
  console.log("\n📜 Test Suite 3: Stringified JSON & Fenced Markdown JSON Parsing");
  const stringifiedJson = JSON.stringify(mockStructured);
  const parsedFromString = parseJobDescription(stringifiedJson);
  assert(parsedFromString.overview === mockStructured.overview, "Stringified JSON parsed correctly");

  const fencedJson = `\`\`\`json\n${JSON.stringify(mockStructured, null, 2)}\n\`\`\``;
  const parsedFromFenced = parseJobDescription(fencedJson);
  assert(parsedFromFenced.responsibilities.length === 2, "Fenced JSON parsed correctly");

  // --- TEST SUITE 4: Legacy Raw Markdown Parsing & Migration ---
  console.log("\n🔄 Test Suite 4: Legacy Markdown String Normalization");
  const legacyMarkdown = `
### Role Overview
CoderKod is seeking a highly skilled Backend MERN Developer to architect high-performance distributed systems.

### Key Responsibilities
* Backend Architecture & API Development: Design, develop and maintain secure and scalable backend services.
* Frontend & SSR Integration: Build responsive interfaces and server-side rendered applications.

### Required Qualifications
* Education: Bachelor's degree in Computer Science, Software Engineering, or a related field.
* Node.js: 5+ years of professional experience building backend systems.

### Preferred Qualifications
* Familiarity with TypeScript
* Experience with MongoDB
* Knowledge of AWS, Azure or GCP

### Benefits & Perks
* Competitive compensation and performance bonuses
* Comprehensive health and wellness coverage
`.trim();

  const parsedLegacy = parseJobDescription(legacyMarkdown);

  assert(
    !parsedLegacy.overview.includes("#") &&
      parsedLegacy.overview.startsWith("CoderKod is seeking"),
    "Legacy Overview extracted with zero '#' markdown characters"
  );

  assert(
    parsedLegacy.responsibilities.length === 2,
    "Legacy Responsibilities extracted as 2 structured items"
  );
  assert(
    parsedLegacy.responsibilities[0].title === "Backend Architecture & API Development",
    "Legacy Responsibility 1 title cleanly split without asterisks"
  );
  assert(
    !parsedLegacy.responsibilities[0].description.includes("*") &&
      parsedLegacy.responsibilities[0].description.startsWith("Design, develop"),
    "Legacy Responsibility 1 description cleanly extracted"
  );

  assert(
    parsedLegacy.requiredQualifications.length === 2,
    "Legacy Required Qualifications extracted as 2 structured items"
  );
  assert(
    parsedLegacy.requiredQualifications[1].title === "Node.js",
    "Legacy Required Qualification 2 title = 'Node.js'"
  );
  assert(
    !parsedLegacy.requiredQualifications[1].description.includes("*") &&
      parsedLegacy.requiredQualifications[1].description.includes("5+ years"),
    "Legacy Required Qualification 2 description contains experience without markdown symbols"
  );

  assert(
    parsedLegacy.preferredQualifications.length === 3,
    "Legacy Preferred Qualifications extracted as 3 items"
  );
  assert(
    !parsedLegacy.preferredQualifications[0].startsWith("*"),
    "Legacy Preferred Qualification item has no leading asterisk"
  );

  assert(
    parsedLegacy.benefits.length === 2,
    "Legacy Benefits extracted as 2 items"
  );

  // --- TEST SUITE 5: Recruiter Plain Text Formatter ---
  console.log("\n📝 Test Suite 5: Text Formatting without Markdown Symbols");
  const formattedText = formatStructuredDescriptionAsText(parsedLegacy);
  assert(!formattedText.includes("###"), "Formatted text has NO '###' symbols");
  assert(!formattedText.includes("**"), "Formatted text has NO '**' bold syntax");
  assert(formattedText.includes("ROLE OVERVIEW"), "Formatted text contains clean uppercase section headings");
  assert(formattedText.includes("KEY RESPONSIBILITIES"), "Formatted text contains KEY RESPONSIBILITIES");

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runJobDescriptionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
