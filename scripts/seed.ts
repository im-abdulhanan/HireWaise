import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

import bcrypt from "bcryptjs";
import connectToDatabase from "../lib/db/mongodb";
import Company from "../models/Company";
import User from "../models/User";
import Job from "../models/Job";
import JobRequirement from "../models/JobRequirement";
import Candidate from "../models/Candidate";
import Resume from "../models/Resume";
import Application from "../models/Application";
import ScreeningResult from "../models/ScreeningResult";
import ScreeningRequirementResult from "../models/ScreeningRequirementResult";
import RecruiterNote from "../models/RecruiterNote";
import GoogleIntegration from "../models/GoogleIntegration";
import { Types } from "mongoose";

async function seedDatabase() {
  console.log("🌱 Starting Database Seed for HireWise SaaS...\n");

  await connectToDatabase();

  // 1. Clean existing seed collections
  console.log("1. Cleaning previous seed data...");
  await Promise.all([
    Company.deleteMany({}),
    User.deleteMany({}),
    Job.deleteMany({}),
    JobRequirement.deleteMany({}),
    Candidate.deleteMany({}),
    Resume.deleteMany({}),
    Application.deleteMany({}),
    ScreeningResult.deleteMany({}),
    ScreeningRequirementResult.deleteMany({}),
    RecruiterNote.deleteMany({}),
    GoogleIntegration.deleteMany({}),
  ]);

  // 2. Create Company
  console.log("2. Creating Company: Acme Cloud Technologies...");
  const company = await Company.create({
    name: "Acme Cloud Technologies",
    slug: "acme-cloud",
    industry: "Cloud Infrastructure & Developer Tools",
    website: "https://acmecloud.io",
    subscriptionTier: "GROWTH",
  });

  // 3. Create Users
  console.log("3. Creating Recruiter & Admin Users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const recruiterUser = await User.create({
    companyId: company._id,
    name: "Sarah Jenkins",
    email: "recruiter@techcorp.io",
    passwordHash,
    role: "RECRUITER",
  });

  const adminUser = await User.create({
    companyId: company._id,
    name: "Alex Rivera",
    email: "admin@techcorp.io",
    passwordHash,
    role: "ADMIN",
  });

  // 4. Create Jobs
  console.log("4. Creating Job Openings with Configured Requirements...");

  // Job 1: Senior Full Stack Engineer
  const job1 = await Job.create({
    companyId: company._id,
    title: "Senior Full Stack Engineer (Node.js & React)",
    slug: "senior-full-stack-engineer",
    department: "Core Product Engineering",
    location: "San Francisco, CA (or Remote)",
    workplaceType: "HYBRID",
    employmentType: "FULL_TIME",
    salaryMin: 155000,
    salaryMax: 195000,
    salaryCurrency: "USD",
    description: `About the Role:
We are seeking an experienced Senior Full Stack Engineer to lead architecture and development across our core web applications and microservices. You will work with Node.js, TypeScript, React, Next.js, and PostgreSQL to deliver high-performance user experiences.

Qualifications:
- 4+ years of professional full-stack software development experience.
- Strong proficiency in Node.js and TypeScript for scalable REST APIs.
- Deep expertise in React.js and modern frontend component architecture (Next.js).
- Strong PostgreSQL relational database design and query optimization skills.
- Experience with Docker, CI/CD pipelines, and cloud services (AWS/GCP) preferred.
- Bachelor's degree in Computer Science or equivalent practical experience.`,
    status: "PUBLISHED",
    currentScreeningVersion: 1,
    scoringWeights: {
      requiredSkillsWeight: 40,
      experienceWeight: 25,
      educationWeight: 15,
      preferredSkillsWeight: 10,
      otherWeight: 10,
    },
    screeningPolicy: {
      requiredSkillsMustMatch: true,
      minimumExperienceMustMatch: true,
      educationRequired: false,
      humanReviewBelowScore: 75,
    },
    applicationsCount: 6,
    strongMatchesCount: 3,
  });

  const job1Requirements = await JobRequirement.create([
    {
      companyId: company._id,
      jobId: job1._id,
      title: "Node.js & TypeScript REST APIs",
      category: "REQUIRED",
      type: "SKILL",
      synonyms: ["nodejs", "typescript", "express", "fastify", "node"],
      order: 1,
    },
    {
      companyId: company._id,
      jobId: job1._id,
      title: "React.js & Next.js Architecture",
      category: "REQUIRED",
      type: "SKILL",
      synonyms: ["react", "reactjs", "nextjs", "next.js", "frontend"],
      order: 2,
    },
    {
      companyId: company._id,
      jobId: job1._id,
      title: "4+ Years Professional Experience",
      category: "REQUIRED",
      type: "EXPERIENCE",
      minimumValue: 4,
      order: 3,
    },
    {
      companyId: company._id,
      jobId: job1._id,
      title: "PostgreSQL & Database Design",
      category: "REQUIRED",
      type: "SKILL",
      synonyms: ["postgres", "postgresql", "sql", "rdbms", "relational database"],
      order: 4,
    },
    {
      companyId: company._id,
      jobId: job1._id,
      title: "Docker, CI/CD & Cloud (AWS/GCP)",
      category: "PREFERRED",
      type: "SKILL",
      synonyms: ["docker", "aws", "gcp", "ci/cd", "kubernetes"],
      order: 5,
    },
    {
      companyId: company._id,
      jobId: job1._id,
      title: "Bachelor's Degree in Computer Science",
      category: "PREFERRED",
      type: "EDUCATION",
      order: 6,
    },
  ]);

  // Job 2: Staff Backend Engineer
  const job2 = await Job.create({
    companyId: company._id,
    title: "Staff Backend Engineer (Distributed Systems & Go)",
    slug: "staff-backend-engineer",
    department: "Platform & Infrastructure",
    location: "New York, NY (or Remote)",
    workplaceType: "REMOTE",
    employmentType: "FULL_TIME",
    salaryMin: 185000,
    salaryMax: 230000,
    salaryCurrency: "USD",
    description: `About the Role:
We are looking for a Staff Backend Engineer to drive the next generation of our real-time distributed ingestion pipeline. You will architect high-throughput event queues, gRPC microservices in Go, and low-latency storage engines.

Key Requirements:
- 6+ years of specialized backend engineering experience.
- Deep expertise in Go (Golang) microservices, concurrency, and gRPC.
- Hands-on experience with high-throughput distributed systems (Kafka, RabbitMQ, Redis).
- Experience with Kubernetes, Docker, and cloud-native observability.
- Strong computer science foundation (M.S. or B.S. in Computer Science preferred).`,
    status: "PUBLISHED",
    currentScreeningVersion: 1,
    scoringWeights: {
      requiredSkillsWeight: 40,
      experienceWeight: 30,
      educationWeight: 10,
      preferredSkillsWeight: 10,
      otherWeight: 10,
    },
    screeningPolicy: {
      requiredSkillsMustMatch: true,
      minimumExperienceMustMatch: true,
      educationRequired: false,
      humanReviewBelowScore: 75,
    },
    applicationsCount: 4,
    strongMatchesCount: 2,
  });

  const job2Requirements = await JobRequirement.create([
    {
      companyId: company._id,
      jobId: job2._id,
      title: "Go (Golang) Microservices & gRPC",
      category: "REQUIRED",
      type: "SKILL",
      synonyms: ["golang", "go", "grpc", "protobuf"],
      order: 1,
    },
    {
      companyId: company._id,
      jobId: job2._id,
      title: "Distributed Systems & Kafka",
      category: "REQUIRED",
      type: "SKILL",
      synonyms: ["kafka", "rabbitmq", "distributed systems", "event driven"],
      order: 2,
    },
    {
      companyId: company._id,
      jobId: job2._id,
      title: "6+ Years Backend Engineering",
      category: "REQUIRED",
      type: "EXPERIENCE",
      minimumValue: 6,
      order: 3,
    },
    {
      companyId: company._id,
      jobId: job2._id,
      title: "Kubernetes & Cloud Native",
      category: "PREFERRED",
      type: "SKILL",
      synonyms: ["kubernetes", "k8s", "docker", "terraform"],
      order: 4,
    },
    {
      companyId: company._id,
      jobId: job2._id,
      title: "Master's Degree in Computer Science",
      category: "PREFERRED",
      type: "EDUCATION",
      order: 5,
    },
  ]);

  // 5. Create 10 Candidates, Resumes, Applications, Screening Results, and Recruiter Notes
  console.log("5. Creating 10 Realistic Candidate Screening Records...");

  const candidatesData = [
    // Job 1 Candidates
    {
      name: "Elena Rostova",
      email: "elena.rostova@gmail.com",
      phone: "+1 (415) 890-1234",
      location: "San Francisco, CA",
      job: job1,
      totalExperienceYears: 6.5,
      skills: ["Node.js", "TypeScript", "React", "Next.js", "PostgreSQL", "Docker", "AWS", "GraphQL"],
      education: [{ degree: "M.S. Computer Science", institution: "MIT", graduationYear: 2018 }],
      experience: [
        {
          company: "CloudScale Systems",
          jobTitle: "Senior Full Stack Engineer",
          startDate: "2021-03",
          isCurrent: true,
          durationYears: 3.5,
          description: "Architected microservices handling 45k req/sec using Node.js, TypeScript, and Express. Built Next.js client dashboard.",
          skillsUsed: ["Node.js", "TypeScript", "Next.js", "PostgreSQL"],
        },
        {
          company: "Apex Innovations",
          jobTitle: "Full Stack Developer",
          startDate: "2018-06",
          endDate: "2021-02",
          durationYears: 3.0,
          description: "Developed customer analytics portals with React and Node.js. Designed relational schemas in PostgreSQL.",
          skillsUsed: ["React", "Node.js", "PostgreSQL", "Docker"],
        },
      ],
      score: 94,
      category: "STRONG_MATCH",
      recruiterStatus: "SHORTLISTED",
      summary: "Exceptional match. 6.5 years experience exceeding the 4-year requirement. Confirmed production experience in Node.js, TypeScript, React, and PostgreSQL.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Architected microservices handling 45k req/sec using Node.js, TypeScript, and Express.", reasoning: "Extensive professional experience with TypeScript & Node.js.", conf: 0.98 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Built Next.js client dashboard and React customer analytics portals.", reasoning: "Demonstrated modern React and Next.js frontend production experience.", conf: 0.96 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "MATCHED", quote: "6.5 years total detected experience across CloudScale and Apex.", reasoning: "6.5 years detected exceeds 4.0 years required.", conf: 0.99 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Designed relational schemas in PostgreSQL and optimized query latency.", reasoning: "Confirmed PostgreSQL database architecture expertise.", conf: 0.95 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "MATCHED", quote: "Containerized deployment pipelines with Docker and AWS.", reasoning: "Bonus cloud and container skills verified.", conf: 0.92 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "M.S. Computer Science from MIT (2018).", reasoning: "Degree requirement satisfied.", conf: 0.99 },
      ],
      notes: ["Outstanding technical background. Recommending for initial engineering leadership screen."],
    },
    {
      name: "Marcus Vance",
      email: "marcus.vance@outlook.com",
      phone: "+1 (512) 445-9876",
      location: "Austin, TX",
      job: job1,
      totalExperienceYears: 3.2,
      skills: ["Node.js", "Express", "React", "MongoDB", "JavaScript"],
      education: [{ degree: "B.S. Software Engineering", institution: "UT Austin", graduationYear: 2021 }],
      experience: [
        {
          company: "Nexus Fintech",
          jobTitle: "Full Stack Developer",
          startDate: "2021-08",
          isCurrent: true,
          durationYears: 3.2,
          description: "Developed user dashboards in React and Node.js REST services with Express.",
          skillsUsed: ["Node.js", "React", "Express", "MongoDB"],
        },
      ],
      score: 68,
      category: "POSSIBLE_MATCH",
      recruiterStatus: "UNDER_REVIEW",
      summary: "Promising candidate with solid Node.js and React foundations, but short of the 4.0 year experience threshold and unconfirmed PostgreSQL depth.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Developed user dashboards in React and Node.js REST services.", reasoning: "Node.js confirmed; TypeScript depth limited.", conf: 0.90 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Developed user dashboards in React.", reasoning: "React experience verified.", conf: 0.92 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "PARTIAL", quote: "3.2 years detected full-stack experience.", reasoning: "Slight shortfall: 3.2 yrs detected vs 4.0 yrs required.", conf: 0.95 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "UNCLEAR", quote: "Worked with NoSQL databases and relational storage.", reasoning: "Exact PostgreSQL proficiency not clearly verified.", conf: 0.70 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Docker or AWS infrastructure experience detected.", conf: 0.90 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "B.S. Software Engineering from UT Austin.", reasoning: "Degree requirement satisfied.", conf: 0.98 },
      ],
      notes: ["Strong React skills. Need to verify PostgreSQL and TypeScript proficiency during interview."],
    },
    {
      name: "David Miller",
      email: "david.miller92@gmail.com",
      phone: "+1 (206) 778-3311",
      location: "Seattle, WA",
      job: job1,
      totalExperienceYears: 1.5,
      skills: ["Python", "Django", "HTML", "CSS", "jQuery"],
      education: [{ degree: "B.A. Digital Arts", institution: "University of Washington", graduationYear: 2022 }],
      experience: [
        {
          company: "Studio Web Design",
          jobTitle: "Junior Web Developer",
          startDate: "2023-01",
          isCurrent: true,
          durationYears: 1.5,
          description: "Built marketing pages in Python and Django.",
          skillsUsed: ["Python", "Django", "HTML"],
        },
      ],
      score: 42,
      category: "DOES_NOT_MEET_STATED_REQUIREMENTS",
      recruiterStatus: "REJECTED",
      summary: "Candidate does not meet stated requirements. Missing core Node.js, TypeScript, and React stack. Experience (1.5 yrs) is below 4.0 yr requirement.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Node.js or TypeScript detected.", conf: 0.98 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No React or Next.js experience detected.", conf: 0.95 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "NOT_FOUND", quote: "1.5 years experience.", reasoning: "1.5 yrs vs 4.0 yrs required.", conf: 0.99 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No PostgreSQL database experience cited.", conf: 0.90 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Docker or Cloud experience detected.", conf: 0.95 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "NOT_FOUND", quote: "B.A. Digital Arts.", reasoning: "Non-computer science degree.", conf: 0.95 },
      ],
      notes: ["Candidate stack does not align with Senior Full Stack requirements."],
    },
    {
      name: "Alex Thorne",
      email: "alex.thorne@techdev.net",
      phone: "+1 (303) 555-7890",
      location: "Denver, CO",
      job: job1,
      totalExperienceYears: 5.0,
      skills: ["Node.js", "TypeScript", "React", "PostgreSQL", "AWS", "Docker"],
      education: [{ degree: "B.S. Computer Science", institution: "CU Boulder", graduationYear: 2019 }],
      experience: [
        {
          company: "Peak Peak Data",
          jobTitle: "Senior Software Engineer",
          startDate: "2019-07",
          isCurrent: true,
          durationYears: 5.0,
          description: "Engineered Node.js APIs and React frontends backed by PostgreSQL and AWS ECS.",
          skillsUsed: ["Node.js", "React", "TypeScript", "PostgreSQL", "AWS"],
        },
      ],
      score: 88,
      category: "STRONG_MATCH",
      recruiterStatus: "INTERVIEWING",
      summary: "Solid match across all required qualifications with 5.0 years experience and direct Node.js/React production track record.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Engineered Node.js APIs backed by PostgreSQL.", reasoning: "Node.js and TypeScript verified.", conf: 0.95 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "React frontends backed by PostgreSQL.", reasoning: "React verified.", conf: 0.94 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "MATCHED", quote: "5.0 years experience at Peak Data.", reasoning: "5.0 yrs exceeds 4.0 yrs required.", conf: 0.98 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "PostgreSQL schema design and optimization.", reasoning: "PostgreSQL confirmed.", conf: 0.92 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "MATCHED", quote: "AWS ECS and Docker containerization.", reasoning: "AWS and Docker confirmed.", conf: 0.93 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "B.S. Computer Science from CU Boulder.", reasoning: "CS Degree confirmed.", conf: 0.97 },
      ],
      notes: ["Phone screen completed. Candidate demonstrated strong TypeScript design skills."],
    },
    {
      name: "Priya Patel",
      email: "priya.patel@devmail.io",
      phone: "+1 (650) 334-9012",
      location: "San Jose, CA",
      job: job1,
      totalExperienceYears: 4.5,
      skills: ["Node.js", "TypeScript", "React", "PostgreSQL", "Redis", "Jest"],
      education: [{ degree: "B.S. Computer Engineering", institution: "San Jose State University", graduationYear: 2020 }],
      experience: [
        {
          company: "Veloce Apps",
          jobTitle: "Full Stack Engineer",
          startDate: "2020-01",
          isCurrent: true,
          durationYears: 4.5,
          description: "Built scalable TypeScript services in Node.js and user interfaces in React.",
          skillsUsed: ["TypeScript", "Node.js", "React", "PostgreSQL"],
        },
      ],
      score: 82,
      category: "STRONG_MATCH",
      recruiterStatus: "NEW",
      summary: "Meets all required qualifications with 4.5 years of TypeScript, Node.js, React, and PostgreSQL experience.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Built scalable TypeScript services in Node.js.", reasoning: "TypeScript and Node.js verified.", conf: 0.96 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "User interfaces in React.", reasoning: "React verified.", conf: 0.93 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "MATCHED", quote: "4.5 years full-stack experience.", reasoning: "4.5 yrs exceeds 4.0 yrs required.", conf: 0.97 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "PostgreSQL database schemas.", reasoning: "PostgreSQL confirmed.", conf: 0.90 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "Docker/AWS unverified.", conf: 0.85 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "B.S. Computer Engineering from SJSU.", reasoning: "Degree verified.", conf: 0.98 },
      ],
      notes: [],
    },
    {
      name: "Liam O'Connor",
      email: "liam.oconnor@irelandtech.ie",
      phone: "+353 87 123 4567",
      location: "Dublin, Ireland",
      job: job1,
      totalExperienceYears: 3.5,
      skills: ["JavaScript", "Node.js", "Vue.js", "MySQL", "Docker"],
      education: [{ degree: "B.S. Information Technology", institution: "Trinity College Dublin", graduationYear: 2021 }],
      experience: [
        {
          company: "Emerald Tech",
          jobTitle: "Software Developer",
          startDate: "2021-02",
          isCurrent: true,
          durationYears: 3.5,
          description: "Maintained web services in Node.js and frontend views in Vue.js and React.",
          skillsUsed: ["Node.js", "Vue.js", "MySQL"],
        },
      ],
      score: 64,
      category: "POSSIBLE_MATCH",
      recruiterStatus: "NEW",
      summary: "Close match with Node.js experience, but experience is 3.5 years (below 4.0 requirement) and primarily uses MySQL and Vue.",
      reqAudit: [
        { reqId: job1Requirements[0]._id, title: job1Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Maintained web services in Node.js.", reasoning: "Node.js verified.", conf: 0.90 },
        { reqId: job1Requirements[1]._id, title: job1Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "PARTIAL", quote: "Frontend views in Vue.js and React.", reasoning: "React mentioned but primary stack was Vue.js.", conf: 0.78 },
        { reqId: job1Requirements[2]._id, title: job1Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "PARTIAL", quote: "3.5 years experience.", reasoning: "3.5 yrs detected vs 4.0 yrs required.", conf: 0.94 },
        { reqId: job1Requirements[3]._id, title: job1Requirements[3].title, cat: "REQUIRED", type: "SKILL", status: "PARTIAL", quote: "MySQL database design.", reasoning: "MySQL rather than PostgreSQL.", conf: 0.82 },
        { reqId: job1Requirements[4]._id, title: job1Requirements[4].title, cat: "PREFERRED", type: "SKILL", status: "MATCHED", quote: "Docker containerization.", reasoning: "Docker verified.", conf: 0.91 },
        { reqId: job1Requirements[5]._id, title: job1Requirements[5].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "B.S. IT from Trinity College.", reasoning: "Degree verified.", conf: 0.95 },
      ],
      notes: [],
    },

    // Job 2 Candidates (Staff Backend Engineer)
    {
      name: "Sarah Chen",
      email: "sarah.chen.infra@gmail.com",
      phone: "+1 (212) 890-5544",
      location: "New York, NY",
      job: job2,
      totalExperienceYears: 8.0,
      skills: ["Go", "Golang", "gRPC", "Kafka", "Distributed Systems", "Kubernetes", "Redis", "PostgreSQL"],
      education: [{ degree: "M.S. Computer Science", institution: "Columbia University", graduationYear: 2016 }],
      experience: [
        {
          company: "FinStream High-Frequency",
          jobTitle: "Staff Backend Engineer",
          startDate: "2019-01",
          isCurrent: true,
          durationYears: 5.5,
          description: "Led development of real-time trading ingestion pipeline processing 250M events daily using Go, gRPC, and Apache Kafka. Scaled cluster on Kubernetes.",
          skillsUsed: ["Go", "gRPC", "Kafka", "Kubernetes"],
        },
        {
          company: "HyperScale Cloud",
          jobTitle: "Senior Backend Developer",
          startDate: "2016-06",
          endDate: "2018-12",
          durationYears: 2.5,
          description: "Built distributed microservices in Go and Redis event brokers.",
          skillsUsed: ["Go", "Redis", "Docker"],
        },
      ],
      score: 96,
      category: "STRONG_MATCH",
      recruiterStatus: "SHORTLISTED",
      summary: "Top-tier candidate. 8.0 years of specialized backend engineering experience in Go, gRPC, and Kafka handling 250M events daily.",
      reqAudit: [
        { reqId: job2Requirements[0]._id, title: job2Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Led development of real-time trading ingestion pipeline processing 250M events daily using Go, gRPC.", reasoning: "Extensive Go microservices and gRPC expertise.", conf: 0.99 },
        { reqId: job2Requirements[1]._id, title: job2Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Apache Kafka event processing cluster on Kubernetes.", reasoning: "Deep Kafka and distributed streaming track record.", conf: 0.98 },
        { reqId: job2Requirements[2]._id, title: job2Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "MATCHED", quote: "8.0 years total backend experience across FinStream and HyperScale.", reasoning: "8.0 yrs detected exceeds 6.0 yrs required.", conf: 0.99 },
        { reqId: job2Requirements[3]._id, title: job2Requirements[3].title, cat: "PREFERRED", type: "SKILL", status: "MATCHED", quote: "Scaled cluster on Kubernetes.", reasoning: "Kubernetes verified.", conf: 0.95 },
        { reqId: job2Requirements[4]._id, title: job2Requirements[4].title, cat: "PREFERRED", type: "EDUCATION", status: "MATCHED", quote: "M.S. Computer Science from Columbia University.", reasoning: "Master's degree verified.", conf: 0.99 },
      ],
      notes: ["Top candidate for Staff Backend. Direct match on all distributed systems and Kafka requirements."],
    },
    {
      name: "Jordan Hayes",
      email: "jordan.hayes@systems.io",
      phone: "+1 (312) 670-8890",
      location: "Chicago, IL",
      job: job2,
      totalExperienceYears: 5.5,
      skills: ["Go", "Python", "RabbitMQ", "Docker", "PostgreSQL"],
      education: [{ degree: "B.S. Computer Science", institution: "University of Illinois", graduationYear: 2019 }],
      experience: [
        {
          company: "LogisticsCore",
          jobTitle: "Senior Backend Engineer",
          startDate: "2019-06",
          isCurrent: true,
          durationYears: 5.5,
          description: "Built event workers in Go using RabbitMQ queues for package routing.",
          skillsUsed: ["Go", "RabbitMQ", "Docker"],
        },
      ],
      score: 72,
      category: "POSSIBLE_MATCH",
      recruiterStatus: "UNDER_REVIEW",
      summary: "Solid Go developer with message queue experience (RabbitMQ), but slightly under the 6.0 year minimum threshold (5.5 yrs detected).",
      reqAudit: [
        { reqId: job2Requirements[0]._id, title: job2Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Built event workers in Go.", reasoning: "Go verified.", conf: 0.92 },
        { reqId: job2Requirements[1]._id, title: job2Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "RabbitMQ queues for package routing.", reasoning: "Message queues verified (RabbitMQ).", conf: 0.90 },
        { reqId: job2Requirements[2]._id, title: job2Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "PARTIAL", quote: "5.5 years backend experience.", reasoning: "5.5 yrs vs 6.0 yrs required.", conf: 0.95 },
        { reqId: job2Requirements[3]._id, title: job2Requirements[3].title, cat: "PREFERRED", type: "SKILL", status: "PARTIAL", quote: "Docker containerization.", reasoning: "Docker present; Kubernetes unconfirmed.", conf: 0.80 },
        { reqId: job2Requirements[4]._id, title: job2Requirements[4].title, cat: "PREFERRED", type: "EDUCATION", status: "PARTIAL", quote: "B.S. Computer Science.", reasoning: "Bachelor's rather than Master's.", conf: 0.92 },
      ],
      notes: ["Good Go fundamentals. Review 0.5 year experience gap with hiring manager."],
    },
    {
      name: "Emily Watson",
      email: "emily.watson95@yahoo.com",
      phone: "+1 (617) 450-2233",
      location: "Boston, MA",
      job: job2,
      totalExperienceYears: 2.0,
      skills: ["PHP", "Laravel", "MySQL", "JavaScript"],
      education: [{ degree: "B.A. Graphic Design", institution: "Boston University", graduationYear: 2022 }],
      experience: [
        {
          company: "Creative Studio",
          jobTitle: "Junior Developer",
          startDate: "2022-06",
          isCurrent: true,
          durationYears: 2.0,
          description: "Maintained PHP and MySQL web portals.",
          skillsUsed: ["PHP", "MySQL"],
        },
      ],
      score: 38,
      category: "DOES_NOT_MEET_STATED_REQUIREMENTS",
      recruiterStatus: "REJECTED",
      summary: "Does not meet requirements. Missing Go, Kafka, distributed systems, and minimum 6 years experience.",
      reqAudit: [
        { reqId: job2Requirements[0]._id, title: job2Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Go or gRPC experience.", conf: 0.98 },
        { reqId: job2Requirements[1]._id, title: job2Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Kafka or distributed systems.", conf: 0.95 },
        { reqId: job2Requirements[2]._id, title: job2Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "NOT_FOUND", quote: "2.0 years detected experience.", reasoning: "2.0 yrs vs 6.0 yrs required.", conf: 0.99 },
        { reqId: job2Requirements[3]._id, title: job2Requirements[3].title, cat: "PREFERRED", type: "SKILL", status: "NOT_FOUND", quote: "", reasoning: "No Kubernetes detected.", conf: 0.95 },
        { reqId: job2Requirements[4]._id, title: job2Requirements[4].title, cat: "PREFERRED", type: "EDUCATION", status: "NOT_FOUND", quote: "", reasoning: "Non-CS degree.", conf: 0.95 },
      ],
      notes: [],
    },
    {
      name: "Chloe Bennett",
      email: "chloe.bennett@cloudgophers.io",
      phone: "+1 (206) 912-3344",
      location: "Seattle, WA",
      job: job2,
      totalExperienceYears: 7.0,
      skills: ["Go", "Golang", "gRPC", "Kafka", "Kubernetes", "AWS", "DynamoDB"],
      education: [{ degree: "B.S. Computer Science", institution: "UW Seattle", graduationYear: 2017 }],
      experience: [
        {
          company: "StreamScale Engine",
          jobTitle: "Senior Go Engineer",
          startDate: "2017-06",
          isCurrent: true,
          durationYears: 7.0,
          description: "Engineered distributed streaming backends in Go with gRPC APIs and Kafka event queues on Kubernetes.",
          skillsUsed: ["Go", "gRPC", "Kafka", "Kubernetes"],
        },
      ],
      score: 90,
      category: "STRONG_MATCH",
      recruiterStatus: "SHORTLISTED",
      summary: "Strong candidate with 7.0 years Go, gRPC, and Kafka engineering experience exceeding all stated requirements.",
      reqAudit: [
        { reqId: job2Requirements[0]._id, title: job2Requirements[0].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Engineered distributed streaming backends in Go with gRPC APIs.", reasoning: "Go and gRPC verified.", conf: 0.97 },
        { reqId: job2Requirements[1]._id, title: job2Requirements[1].title, cat: "REQUIRED", type: "SKILL", status: "MATCHED", quote: "Kafka event queues on Kubernetes.", reasoning: "Kafka and distributed queues verified.", conf: 0.96 },
        { reqId: job2Requirements[2]._id, title: job2Requirements[2].title, cat: "REQUIRED", type: "EXPERIENCE", status: "MATCHED", quote: "7.0 years Go engineering.", reasoning: "7.0 yrs exceeds 6.0 yrs required.", conf: 0.98 },
        { reqId: job2Requirements[3]._id, title: job2Requirements[3].title, cat: "PREFERRED", type: "SKILL", status: "MATCHED", quote: "Kubernetes and AWS deployment.", reasoning: "Kubernetes verified.", conf: 0.94 },
        { reqId: job2Requirements[4]._id, title: job2Requirements[4].title, cat: "PREFERRED", type: "EDUCATION", status: "PARTIAL", quote: "B.S. Computer Science.", reasoning: "Bachelor's degree.", conf: 0.95 },
      ],
      notes: ["Excellent candidate. Progressing to technical interview."],
    },
  ];

  for (const candData of candidatesData) {
    const candidate = await Candidate.create({
      companyId: company._id,
      name: candData.name,
      email: candData.email,
      phone: candData.phone,
      location: candData.location,
      skills: candData.skills,
      normalizedSkills: candData.skills.map((s) => s.toLowerCase()),
      totalExperienceYears: candData.totalExperienceYears,
      education: candData.education,
      experience: candData.experience,
      summary: candData.summary,
    });

    const resume = await Resume.create({
      companyId: company._id,
      candidateId: candidate._id,
      storageKey: `resumes/${candidate._id}.pdf`,
      originalFilename: `${candData.name.replace(/\s+/g, "_")}_Resume.pdf`,
      mimeType: "application/pdf",
      size: 45200,
      status: "PARSED",
      parsedText: `Resume of ${candData.name}\n${candData.summary}\nExperience: ${candData.totalExperienceYears} years\nSkills: ${candData.skills.join(", ")}`,
    });

    const application = await Application.create({
      companyId: company._id,
      jobId: candData.job._id,
      candidateId: candidate._id,
      resumeId: resume._id,
      status: candData.recruiterStatus,
      screeningStatus: "COMPLETED",
      appliedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
    });

    const screeningResult = await ScreeningResult.create({
      companyId: company._id,
      applicationId: application._id,
      candidateId: candidate._id,
      jobId: candData.job._id,
      overallScore: candData.score,
      category: candData.category,
      scoreBreakdown: {
        skillsScore: Math.round(candData.score * 0.4),
        experienceScore: Math.round(candData.score * 0.25),
        educationScore: Math.round(candData.score * 0.15),
        preferredSkillsScore: Math.round(candData.score * 0.1),
        otherScore: Math.round(candData.score * 0.1),
      },
      summary: candData.summary,
      confidence: 0.95,
      matchedRequiredSkillsCount: candData.reqAudit.filter((r) => r.cat === "REQUIRED" && r.status === "MATCHED").length,
      totalRequiredSkillsCount: candData.reqAudit.filter((r) => r.cat === "REQUIRED").length,
      matchedPreferredSkillsCount: candData.reqAudit.filter((r) => r.cat === "PREFERRED" && r.status === "MATCHED").length,
      totalPreferredSkillsCount: candData.reqAudit.filter((r) => r.cat === "PREFERRED").length,
      detectedExperienceYears: candData.totalExperienceYears,
      requiredExperienceYears: candData.job.slug.includes("staff") ? 6 : 4,
      humanReviewRecommended: candData.score < 75,
      humanReviewReasons: candData.score < 75 ? ["Score below 75% policy threshold", "Review experience or missing requirements"] : [],
      screeningVersion: 1,
      jobRequirementsSnapshot: candData.reqAudit,
      scoringWeightsSnapshot: candData.job.scoringWeights,
      screeningPolicySnapshot: candData.job.screeningPolicy,
      aiUsage: {
        model: "gemini-1.5-flash",
        inputTokens: 1420,
        outputTokens: 530,
        processingDurationMs: 1650,
        estimatedCostUsd: 0.00032,
      },
      screenedAt: new Date(),
    });

    // Create ScreeningRequirementResults
    for (const audit of candData.reqAudit) {
      await ScreeningRequirementResult.create({
        companyId: company._id,
        applicationId: application._id,
        candidateId: candidate._id,
        jobId: candData.job._id,
        jobRequirementId: audit.reqId,
        requirementTitle: audit.title,
        requirementCategory: audit.cat,
        requirementType: audit.type,
        status: audit.status,
        evidenceQuote: audit.quote,
        reasoning: audit.reasoning,
        confidence: audit.conf,
        verifiedByAi: true,
      });
    }

    // Create RecruiterNotes
    for (const noteText of candData.notes) {
      await RecruiterNote.create({
        companyId: company._id,
        applicationId: application._id,
        candidateId: candidate._id,
        userId: recruiterUser._id,
        authorName: recruiterUser.name,
        content: noteText,
      });
    }
  }

  console.log("\n=========================================");
  console.log(" Database Seeding Complete!");
  console.log("=========================================");
  console.log("Company: Acme Cloud Technologies (acme-cloud)");
  console.log("Recruiter User: recruiter@techcorp.io / password123");
  console.log("Admin User:     admin@techcorp.io / password123");
  console.log(`Jobs Created:   2 (${job1.title}, ${job2.title})`);
  console.log("Candidates:     10 Applications Screened with Real Evidence");
  console.log("=========================================\n");

  process.exit(0);
}

seedDatabase().catch((e) => {
  console.error("Database seed error:", e);
  process.exit(1);
});
