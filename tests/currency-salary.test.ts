import {
  SUPPORTED_CURRENCIES,
  getCurrency,
  searchCurrencies,
  formatSalaryAmount,
  formatSalaryRange,
  isValidCurrencyCode,
} from "../lib/currency/currencies";

async function runCurrencySalaryTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING INTERNATIONAL SALARY & CURRENCY TESTS");
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

  // --- TEST SUITE 1: ISO 4217 Currency Registry Coverage ---
  console.log("🌍 Test Suite 1: Required ISO 4217 Currency Support");
  const requiredCurrencies = [
    { code: "USD", name: "US Dollar" },
    { code: "PKR", name: "Pakistani Rupee" },
    { code: "EUR", name: "Euro" },
    { code: "INR", name: "Indian Rupee" },
    { code: "GBP", name: "British Pound" },
    { code: "SAR", name: "Saudi Riyal" },
    { code: "AED", name: "UAE Dirham" },
    { code: "QAR", name: "Qatari Riyal" },
    { code: "KWD", name: "Kuwaiti Dinar" },
    { code: "BHD", name: "Bahraini Dinar" },
    { code: "OMR", name: "Omani Rial" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "TRY", name: "Turkish Lira" },
  ];

  for (const rc of requiredCurrencies) {
    const config = getCurrency(rc.code);
    assert(
      config.code === rc.code && config.name === rc.name,
      `Currency ${rc.code} (${rc.name}) configured in registry`
    );
  }

  // --- TEST SUITE 2: Currency Search & Validation ---
  console.log("\n🔍 Test Suite 2: Currency Search & Validation");
  assert(isValidCurrencyCode("PKR") === true, "isValidCurrencyCode('PKR') = true");
  assert(isValidCurrencyCode("pkr") === true, "isValidCurrencyCode('pkr') case-insensitive = true");
  assert(isValidCurrencyCode("XYZ_INVALID") === false, "isValidCurrencyCode('XYZ_INVALID') = false");

  const searchResultsPak = searchCurrencies("Pakistani");
  assert(searchResultsPak.some((c) => c.code === "PKR"), "Search 'Pakistani' returns PKR");

  const searchResultsEuro = searchCurrencies("EUR");
  assert(searchResultsEuro.some((c) => c.code === "EUR"), "Search 'EUR' returns EUR");

  const searchResultsDirham = searchCurrencies("Dirham");
  assert(searchResultsDirham.some((c) => c.code === "AED"), "Search 'Dirham' returns AED");

  // --- TEST SUITE 3: Candidate & Recruiter Salary Range Formatting ---
  console.log("\n💰 Test Suite 3: Internationalized Salary Range Formatting");

  // Pakistani Rupee
  const pkrFormatted = formatSalaryRange(100000, 150000, "PKR");
  assert(
    pkrFormatted === "₨100,000 – ₨150,000 PKR",
    `PKR format: "${pkrFormatted}" matches "₨100,000 – ₨150,000 PKR"`
  );

  // US Dollar
  const usdFormatted = formatSalaryRange(80000, 100000, "USD");
  assert(
    usdFormatted === "$80,000 – $100,000 USD",
    `USD format: "${usdFormatted}" matches "$80,000 – $100,000 USD"`
  );

  // Euro
  const eurFormatted = formatSalaryRange(60000, 75000, "EUR");
  assert(
    eurFormatted === "€60,000 – €75,000 EUR",
    `EUR format: "${eurFormatted}" matches "€60,000 – €75,000 EUR"`
  );

  // Indian Rupee
  const inrFormatted = formatSalaryRange(800000, 1000000, "INR");
  assert(
    inrFormatted === "₹800,000 – ₹1,000,000 INR",
    `INR format: "${inrFormatted}" matches "₹800,000 – ₹1,000,000 INR"`
  );

  // British Pound
  const gbpFormatted = formatSalaryRange(50000, 70000, "GBP");
  assert(
    gbpFormatted === "£50,000 – £70,000 GBP",
    `GBP format: "${gbpFormatted}" matches "£50,000 – £70,000 GBP"`
  );

  // Saudi Riyal
  const sarFormatted = formatSalaryRange(15000, 25000, "SAR");
  assert(
    sarFormatted === "ر.س15,000 – ر.س25,000 SAR",
    `SAR format: "${sarFormatted}" matches "ر.س15,000 – ر.س25,000 SAR"`
  );

  // UAE Dirham
  const aedFormatted = formatSalaryRange(18000, 28000, "AED");
  assert(
    aedFormatted === "د.إ18,000 – د.إ28,000 AED",
    `AED format: "${aedFormatted}" matches "د.إ18,000 – د.إ28,000 AED"`
  );

  // Single Min or Max bounds
  const minOnly = formatSalaryRange(100000, undefined, "PKR");
  assert(minOnly === "From ₨100,000 PKR", `Min only format: "${minOnly}"`);

  const maxOnly = formatSalaryRange(undefined, 150000, "PKR");
  assert(maxOnly === "Up to ₨150,000 PKR", `Max only format: "${maxOnly}"`);

  const emptySalary = formatSalaryRange(undefined, undefined, "PKR");
  assert(emptySalary === null, "Empty salary returns null (hidden/optional)");

  // Equal bounds
  const equalBounds = formatSalaryRange(120000, 120000, "USD");
  assert(equalBounds === "$120,000 USD", `Exact salary format: "${equalBounds}"`);

  console.log("\n==================================================");
  console.log(`📊 TEST RESULTS: ${testPassed} Passed, ${testFailed} Failed`);
  console.log("==================================================");

  if (testFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCurrencySalaryTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
