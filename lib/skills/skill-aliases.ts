/**
 * Application-Owned Skill Aliases, Hierarchy & Context Dictionary
 * 
 * Provides:
 * 1. Rich alias mappings for modern web, cloud, DevOps, databases, and safety tools
 *    that may not be fully represented in general taxonomies.
 * 2. Parent/Child skill hierarchies for multi-layer inference.
 * 3. Contextual action keywords and domain entities for verifying specialized responsibilities.
 */

export interface CustomSkillDefinition {
  canonicalKey: string;
  displayName: string;
  category: "TECHNICAL" | "DEVOPS" | "CLOUD" | "DATABASE" | "SAFETY" | "OFFICE" | "MANAGEMENT" | "GENERAL";
  aliases: string[];
  parents?: string[];
  children?: string[];
  actionKeywords?: string[];
  associatedEntities?: string[];
  escoConceptUri?: string;
}

export const APPLICATION_SKILL_ALIASES: Record<string, CustomSkillDefinition> = {
  // =========================================================================
  // LINUX & SYSTEM ADMINISTRATION
  // =========================================================================
  linux: {
    canonicalKey: "linux",
    displayName: "Linux",
    category: "TECHNICAL",
    aliases: [
      "linux",
      "linux os",
      "gnu/linux",
      "gnu linux",
      "unix/linux",
      "unix linux",
      "linux environment",
      "linux operating system",
      "linux platform",
    ],
    parents: ["operating_systems"],
    children: [
      "linux_administration",
      "ubuntu",
      "debian",
      "centos",
      "rhel",
      "redhat",
      "arch_linux",
      "fedora",
      "linux_mint",
      "bash",
      "shell_scripting",
    ],
  },
  linux_administration: {
    canonicalKey: "linux_administration",
    displayName: "Linux Administration",
    category: "DEVOPS",
    aliases: [
      "linux administration",
      "linux admin",
      "linux system administration",
      "linux systems administration",
      "linux sysadmin",
      "sysadmin (linux)",
      "linux sys admin",
      "linux server administration",
      "linux server management",
      "linux infrastructure",
      "linux system administrator",
      "linux systems administrator",
    ],
    parents: ["linux"],
    children: [
      "ubuntu_administration",
      "rhel_administration",
      "centos_administration",
    ],
    actionKeywords: [
      "administered",
      "administer",
      "administering",
      "managed",
      "managing",
      "configured",
      "configuring",
      "maintained",
      "maintaining",
      "setup",
      "setting up",
      "installation",
      "installed",
      "hardening",
      "troubleshooting",
      "troubleshoot",
      "monitoring",
      "provisioned",
      "provisioning",
      "deployed",
      "deploying",
    ],
    associatedEntities: [
      "ubuntu",
      "centos",
      "debian",
      "rhel",
      "redhat",
      "server",
      "servers",
      "systemd",
      "users",
      "permissions",
      "kernel",
      "daemon",
      "service",
      "services",
      "ssh",
      "iptables",
      "firewall",
      "nginx",
      "apache",
      "cron",
      "package manager",
      "apt",
      "yum",
    ],
  },
  ubuntu: {
    canonicalKey: "ubuntu",
    displayName: "Ubuntu",
    category: "TECHNICAL",
    aliases: ["ubuntu", "ubuntu server", "ubuntu linux", "ubuntu desktop"],
    parents: ["linux"],
  },
  debian: {
    canonicalKey: "debian",
    displayName: "Debian",
    category: "TECHNICAL",
    aliases: ["debian", "debian linux", "debian gnu/linux"],
    parents: ["linux"],
  },
  centos: {
    canonicalKey: "centos",
    displayName: "CentOS",
    category: "TECHNICAL",
    aliases: ["centos", "centos linux", "centos 7", "centos 8", "centos stream"],
    parents: ["linux"],
  },
  rhel: {
    canonicalKey: "rhel",
    displayName: "RHEL (Red Hat Enterprise Linux)",
    category: "TECHNICAL",
    aliases: ["rhel", "redhat", "red hat", "red hat enterprise linux", "redhat linux"],
    parents: ["linux"],
  },
  bash: {
    canonicalKey: "bash",
    displayName: "Bash Scripting",
    category: "TECHNICAL",
    aliases: ["bash", "bash scripting", "shell scripting", "sh", "zsh", "shell script", "bash script"],
    parents: ["linux"],
  },

  // =========================================================================
  // JAVASCRIPT & MODERN FRONTEND
  // =========================================================================
  javascript: {
    canonicalKey: "javascript",
    displayName: "JavaScript",
    category: "TECHNICAL",
    aliases: ["javascript", "js", "ecmascript", "es6", "es6+", "vanilla javascript", "vanilla js"],
    children: ["typescript", "react", "vue", "angular", "nodejs", "express", "nextjs"],
    escoConceptUri: "http://data.europa.eu/esco/skill/3cd569a2-4f88-4c1e-9995-8dce8c5e51a7",
  },
  typescript: {
    canonicalKey: "typescript",
    displayName: "TypeScript",
    category: "TECHNICAL",
    aliases: ["typescript", "ts"],
    parents: ["javascript"],
  },
  react: {
    canonicalKey: "react",
    displayName: "React",
    category: "TECHNICAL",
    aliases: [
      "react",
      "react.js",
      "reactjs",
      "react js",
      "react.js library",
      "react native",
      "react-native",
    ],
    parents: ["javascript"],
    children: ["nextjs", "react_native"],
  },
  nextjs: {
    canonicalKey: "nextjs",
    displayName: "Next.js",
    category: "TECHNICAL",
    aliases: ["next.js", "nextjs", "next", "next js", "next 13", "next 14"],
    parents: ["react", "javascript"],
  },
  vue: {
    canonicalKey: "vue",
    displayName: "Vue.js",
    category: "TECHNICAL",
    aliases: ["vue", "vue.js", "vuejs", "vue js", "vue 3", "nuxt", "nuxtjs", "nuxt.js"],
    parents: ["javascript"],
  },
  angular: {
    canonicalKey: "angular",
    displayName: "Angular",
    category: "TECHNICAL",
    aliases: ["angular", "angularjs", "angular 2+", "angular.js"],
    parents: ["javascript"],
  },
  tailwind: {
    canonicalKey: "tailwind",
    displayName: "Tailwind CSS",
    category: "TECHNICAL",
    aliases: ["tailwind", "tailwindcss", "tailwind css", "tailwind-css"],
  },

  // =========================================================================
  // BACKEND & LANGUAGES
  // =========================================================================
  nodejs: {
    canonicalKey: "nodejs",
    displayName: "Node.js",
    category: "TECHNICAL",
    aliases: ["nodejs", "node.js", "node js", "node", "node runtime"],
    parents: ["javascript"],
    children: ["express", "nestjs"],
  },
  express: {
    canonicalKey: "express",
    displayName: "Express.js",
    category: "TECHNICAL",
    aliases: ["express", "express.js", "expressjs", "express js"],
    parents: ["nodejs"],
  },
  python: {
    canonicalKey: "python",
    displayName: "Python",
    category: "TECHNICAL",
    aliases: ["python", "python3", "py", "python 3", "python programming", "python development"],
    children: ["django", "flask", "fastapi", "pandas", "numpy", "pytorch", "tensorflow"],
    escoConceptUri: "http://data.europa.eu/esco/skill/ccd0a1d9-afda-43d9-b901-96344886e14d",
  },
  django: {
    canonicalKey: "django",
    displayName: "Django",
    category: "TECHNICAL",
    aliases: ["django", "django rest framework", "drf"],
    parents: ["python"],
  },
  fastapi: {
    canonicalKey: "fastapi",
    displayName: "FastAPI",
    category: "TECHNICAL",
    aliases: ["fastapi", "fast api"],
    parents: ["python"],
  },
  go: {
    canonicalKey: "go",
    displayName: "Go (Golang)",
    category: "TECHNICAL",
    aliases: ["go", "golang", "go programming", "go language", "go lang"],
  },
  java: {
    canonicalKey: "java",
    displayName: "Java",
    category: "TECHNICAL",
    aliases: ["java", "core java", "java 8", "java 11", "java 17", "java 21"],
    children: ["spring_boot"],
  },
  spring_boot: {
    canonicalKey: "spring_boot",
    displayName: "Spring Boot",
    category: "TECHNICAL",
    aliases: ["spring boot", "springboot", "spring framework", "spring-boot"],
    parents: ["java"],
  },
  csharp: {
    canonicalKey: "csharp",
    displayName: "C# (.NET)",
    category: "TECHNICAL",
    aliases: ["c#", "csharp", "c sharp", ".net", "dotnet", ".net core", "asp.net"],
  },
  blockchain: {
    canonicalKey: "blockchain",
    displayName: "Blockchain",
    category: "TECHNICAL",
    aliases: [
      "blockchain",
      "block chain",
      "web3",
      "smart contracts",
      "solidity",
      "ethereum",
      "crypto",
      "hyperledger",
      "distributed ledger",
    ],
  },
  cybersecurity: {
    canonicalKey: "cybersecurity",
    displayName: "Cybersecurity",
    category: "TECHNICAL",
    aliases: [
      "cybersecurity",
      "cyber security",
      "information security",
      "infosec",
      "network security",
      "security analyst",
    ],
  },
  cia: {
    canonicalKey: "cia",
    displayName: "CIA (Confidentiality, Integrity, Availability)",
    category: "TECHNICAL",
    aliases: [
      "cia",
      "cia triad",
      "confidentiality integrity availability",
      "certified internal auditor",
    ],
  },

  // =========================================================================
  // DATABASES
  // =========================================================================
  database: {
    canonicalKey: "database",
    displayName: "Databases / SQL",
    category: "DATABASE",
    aliases: ["database", "databases", "db", "rdbms", "relational database", "sql database", "database management systems"],
    children: ["sql", "postgresql", "mysql", "mongodb", "redis", "oracle_sql", "sqlite"],
    escoConceptUri: "http://data.europa.eu/esco/skill/ab1e97ed-2319-4293-a8b7-072d2648822f",
  },
  sql: {
    canonicalKey: "sql",
    displayName: "SQL",
    category: "DATABASE",
    aliases: ["sql", "structured query language", "ansi sql", "relational sql"],
    parents: ["database"],
    children: ["postgresql", "mysql", "sqlite", "mssql", "oracle_sql"],
    escoConceptUri: "http://data.europa.eu/esco/skill/598de5b0-5b58-4ea7-8058-a4bc4d18c742",
  },
  postgresql: {
    canonicalKey: "postgresql",
    displayName: "PostgreSQL",
    category: "DATABASE",
    aliases: ["postgresql", "postgres", "psql", "postgres sql", "postgre sql"],
    parents: ["sql", "database"],
  },
  mysql: {
    canonicalKey: "mysql",
    displayName: "MySQL",
    category: "DATABASE",
    aliases: ["mysql", "my sql", "mariadb", "maria db"],
    parents: ["sql", "database"],
    escoConceptUri: "http://data.europa.eu/esco/skill/4da171e5-779c-4983-a76f-91c16751e99f",
  },
  mongodb: {
    canonicalKey: "mongodb",
    displayName: "MongoDB",
    category: "DATABASE",
    aliases: ["mongodb", "mongo", "nosql", "document database", "mongoose"],
    parents: ["database"],
  },
  redis: {
    canonicalKey: "redis",
    displayName: "Redis",
    category: "DATABASE",
    aliases: ["redis", "redis cache", "in-memory database"],
    parents: ["database"],
  },

  // =========================================================================
  // CLOUD & DEVOPS
  // =========================================================================
  cloud: {
    canonicalKey: "cloud",
    displayName: "Cloud Platforms",
    category: "CLOUD",
    aliases: ["cloud", "cloud computing", "cloud infrastructure", "cloud services"],
    children: ["aws", "azure", "gcp"],
  },
  aws: {
    canonicalKey: "aws",
    displayName: "Amazon Web Services (AWS)",
    category: "CLOUD",
    aliases: [
      "aws",
      "amazon web services",
      "amazon cloud",
      "aws cloud",
      "ec2",
      "s3",
      "lambda",
      "aws lambda",
      "dynamodb",
      "cloudformation",
      "ecs",
      "eks",
    ],
    parents: ["cloud"],
  },
  azure: {
    canonicalKey: "azure",
    displayName: "Microsoft Azure",
    category: "CLOUD",
    aliases: ["azure", "microsoft azure", "azure cloud", "azure devops", "azure functions"],
    parents: ["cloud"],
  },
  gcp: {
    canonicalKey: "gcp",
    displayName: "Google Cloud Platform (GCP)",
    category: "CLOUD",
    aliases: ["gcp", "google cloud platform", "google cloud", "google cloud services"],
    parents: ["cloud"],
  },
  devops: {
    canonicalKey: "devops",
    displayName: "DevOps",
    category: "DEVOPS",
    aliases: ["devops", "dev ops", "development operations", "sre", "site reliability engineering"],
    children: ["docker", "kubernetes", "ci_cd", "terraform", "ansible", "linux_administration"],
  },
  docker: {
    canonicalKey: "docker",
    displayName: "Docker",
    category: "DEVOPS",
    aliases: ["docker", "docker container", "docker containers", "containerization", "docker compose"],
    parents: ["devops"],
  },
  kubernetes: {
    canonicalKey: "kubernetes",
    displayName: "Kubernetes",
    category: "DEVOPS",
    aliases: ["kubernetes", "k8s", "helm", "k8s cluster", "kubernetes cluster"],
    parents: ["devops", "docker"],
  },
  ci_cd: {
    canonicalKey: "ci_cd",
    displayName: "CI/CD",
    category: "DEVOPS",
    aliases: [
      "ci/cd",
      "cicd",
      "continuous integration",
      "continuous deployment",
      "continuous delivery",
      "github actions",
      "jenkins",
      "gitlab ci",
    ],
    parents: ["devops"],
  },
  git: {
    canonicalKey: "git",
    displayName: "Git (Version Control)",
    category: "TECHNICAL",
    aliases: ["git", "github", "gitlab", "bitbucket", "version control", "vcs"],
  },

  // =========================================================================
  // HEALTH, SAFETY & ENVIRONMENT (HSE) & CERTIFICATIONS
  // =========================================================================
  hse: {
    canonicalKey: "hse",
    displayName: "Health, Safety & Environment (HSE)",
    category: "SAFETY",
    aliases: [
      "hse",
      "ehs",
      "she",
      "health safety environmental",
      "health safety environment",
      "health, safety and environment",
      "health, safety & environment",
      "health safety and environmental engineering",
      "environment health safety",
      "environmental health and safety",
      "occupational health and safety",
      "occupational health & safety",
      "health & safety",
      "health and safety",
      "safety officer",
      "hse officer",
      "hse supervisor",
      "hse engineer",
      "safety engineer",
      "safety and health",
      "workplace safety",
      "industrial safety",
    ],
    children: ["nebosh", "osha", "iosh", "first_aid"],
  },
  nebosh: {
    canonicalKey: "nebosh",
    displayName: "NEBOSH",
    category: "SAFETY",
    aliases: [
      "nebosh",
      "national examination board in occupational safety and health",
      "national examination board in occupational safety & health",
      "nebosh igc",
      "nebosh international general certificate",
      "nebosh hsw",
      "nebosh certificate",
      "nebosh diploma",
      "the national examination board in occupational safety & health",
    ],
    parents: ["hse"],
  },
  osha: {
    canonicalKey: "osha",
    displayName: "OSHA",
    category: "SAFETY",
    aliases: [
      "osha",
      "occupational safety and health administration",
      "occupational safety & health administration",
      "osha 30",
      "osha 30 hours",
      "osha 30-hour",
      "osha 10",
      "osha 10 hours",
      "osha certified",
      "osha certification",
      "osha general industry",
      "osha construction",
    ],
    parents: ["hse"],
  },
  iosh: {
    canonicalKey: "iosh",
    displayName: "IOSH",
    category: "SAFETY",
    aliases: [
      "iosh",
      "institution of occupational safety and health",
      "institution of occupational safety & health",
      "iosh managing safely",
      "iosh working safely",
      "managing safely",
      "working safely",
    ],
    parents: ["hse"],
  },
  first_aid: {
    canonicalKey: "first_aid",
    displayName: "First Aid & CPR",
    category: "SAFETY",
    aliases: ["first aid", "cpr", "basic life support", "bls", "emergency first aid"],
    parents: ["hse"],
  },

  // =========================================================================
  // OFFICE & COMPUTER OPERATOR
  // =========================================================================
  computer_skills: {
    canonicalKey: "computer_skills",
    displayName: "Computer Skills",
    category: "OFFICE",
    aliases: [
      "computer skills",
      "computer literacy",
      "computer literate",
      "basic computer skills",
      "it skills",
      "computer proficiency",
      "computer applications",
      "information technology",
    ],
    children: ["computer_operator", "data_entry", "ms_office"],
  },
  computer_operator: {
    canonicalKey: "computer_operator",
    displayName: "Computer Operator",
    category: "OFFICE",
    aliases: [
      "computer operator",
      "computer operation",
      "computer operator / data entry",
      "computer operator & data entry",
      "it operator",
    ],
    parents: ["computer_skills"],
    children: ["data_entry"],
  },
  data_entry: {
    canonicalKey: "data_entry",
    displayName: "Data Entry",
    category: "OFFICE",
    aliases: [
      "data entry",
      "data entry operator",
      "data input",
      "data processing",
      "data entry clerk",
      "data entry specialist",
      "typing",
    ],
    parents: ["computer_operator", "computer_skills"],
  },
  ms_office: {
    canonicalKey: "ms_office",
    displayName: "Microsoft Office",
    category: "OFFICE",
    aliases: [
      "ms office",
      "microsoft office",
      "ms-office",
      "microsoft office suite",
      "ms office suite",
      "office 365",
      "microsoft 365",
      "ms word",
      "microsoft word",
      "ms excel",
      "microsoft excel",
      "excel",
      "word",
      "powerpoint",
      "ms powerpoint",
      "microsoft powerpoint",
    ],
    parents: ["computer_skills"],
  },
};

/**
 * Normalizes input string to a trimmed, lowercase alphanumeric string.
 */
export function cleanAlphanumeric(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.+#/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes regex characters safely.
 */
function escapeRegexStr(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Resolves an application custom alias if available.
 */
export function resolveApplicationAlias(input: string): CustomSkillDefinition | null {
  if (!input) return null;
  const cleaned = cleanAlphanumeric(input);

  // 1. Direct canonical key match
  if (APPLICATION_SKILL_ALIASES[cleaned]) {
    return APPLICATION_SKILL_ALIASES[cleaned];
  }

  // 2. Exact alias match
  for (const [key, def] of Object.entries(APPLICATION_SKILL_ALIASES)) {
    if (def.aliases.some((alias) => cleanAlphanumeric(alias) === cleaned)) {
      return def;
    }
  }

  // 3. Word-boundary regex match for compound phrases ONLY (alias length >= 4)
  // e.g. "Senior Linux Administration" -> "linux_administration"
  for (const [key, def] of Object.entries(APPLICATION_SKILL_ALIASES)) {
    for (const alias of def.aliases) {
      const cleanAlias = cleanAlphanumeric(alias);
      if (cleanAlias.length >= 4) {
        const escaped = escapeRegexStr(alias.trim()).replace(/\\\s+/g, "[\\s&/,-]+");
        const regex = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, "i");
        if (regex.test(input)) {
          return def;
        }
      }
    }
  }

  return null;
}
