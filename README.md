# ScreenAI — Production-Ready AI Resume Screening & Candidate Matching SaaS

ScreenAI is an enterprise-ready, B2B SaaS platform that automates initial candidate screening and qualification verification for recruitment teams. It combines **deterministic matching rules**, **Gemini-powered evidence quote extraction**, **strict multi-tenant data isolation**, and **live 17-column Google Sheets synchronization**.

---

## 🌟 Key Features

- **Autonomous AI Screening Engine:** Gemini-powered extraction of skills, timeline, and education with verbatim evidence quotes and zero hallucination guarantees.
- **Deterministic Matcher & Policy Studio:** Custom scoring weights (Required Skills, Experience, Education, Preferred, Other) with configurable strict rules per job.
- **Public Candidate Portal:** Zero-friction application submission with drag-and-drop resume upload (PDF/DOCX) and multi-step progress indicators.
- **Interactive Evidence Audit Cards:** Visual match badges (`MATCHED`, `PARTIAL`, `NOT_FOUND`, `UNCLEAR`) citing exact resume sentences with confidence scores.
- **17-Column Live Google Sheets Sync:** Connect via OAuth 2.0 with AES-256 encrypted tokens at rest to synchronize candidate screening results in real time.
- **Human Decision Workflow:** Recruiters retain 100% control over hiring statuses (`NEW`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEWING`, `REJECTED`, `HIRED`) and private evaluation notes.
- **Enterprise Security:** Multi-tenant session verification, sliding-window IP rate limiting, SHA-256 submission idempotency, and prompt injection defense boundaries.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 14+ (App Router, Server Actions, Route Handlers)
- **Language:** TypeScript 5+
- **Database & ODM:** MongoDB & Mongoose
- **Authentication:** Auth.js (NextAuth.js) with bcrypt credential provider & session validation
- **AI / LLM:** Google Gemini API (`@google/generative-ai`)
- **Integrations:** Google Workspace API (`googleapis`) with AES-256-GCM token encryption
- **Document Parsers:** `pdf-parse` (PDF) and `mammoth` (DOCX) with magic-byte validation
- **Styling:** Tailwind CSS & Lucide React icons

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/im-abdulhanan/ai-resume-screening-saas.git
cd ai-resume-screening-saas
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/resume_screening_db

# NextAuth / Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-32-byte-secret

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth 2.0 (For Google Sheets Integration)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Token Encryption Secret (64-hex chars for AES-256-GCM)
GOOGLE_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Storage Provider ('local' or 's3')
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR=./uploads/resumes
```

### 4. Seed the Database
Populate realistic companies, recruiter accounts, jobs, and 10 candidate screening applications:
```bash
npx tsx scripts/seed.ts
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## 🔑 Demo Recruiter Credentials

- **Email:** `recruiter@techcorp.io`
- **Password:** `password123`
- **Admin Email:** `admin@techcorp.io` (`password123`)

---

## 🧪 Test Suites

Run the full automated test suite (116 passing tests across 7 test suites):
```bash
npx tsx tests/e2e.test.ts
```

---

## 📄 License
MIT License.
