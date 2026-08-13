import type { ExperienceItem } from "@/types";

/** Newest first. Bullets are "verb + what + measurable result". */
export const experience: ExperienceItem[] = [
  {
    role: "SWE Intern",
    company: "Invesho AI",
    period: "Jul 2025 — Nov 2025",
    location: "Remote",
    kind: "work",
    summary: "Payments and delivery infrastructure for an early-stage product.",
    points: [
      "Implemented recurring payments end to end with PayPal's Subscription API, covering plan creation, webhooks and lifecycle states.",
      "Integrated automatic email verification with Reacher and deployed it on a self-managed VPS in OVH Cloud, cutting invalid signups at the door.",
    ],
    stack: ["PayPal API", "Reacher", "OVH Cloud", "VPS", "Node.js"],
  },
  {
    role: "Software Development Engineer Intern",
    company: "Amazon Development Centre India",
    period: "May 2025 — Jul 2025",
    location: "On site · Chennai",
    kind: "work",
    featured: true,
    summary:
      "Built an MCP server that gave Financial Account Authority a natural-language query layer — and two tools on top of it that erased days of manual work.",
    points: [
      "Built an enhanced querying mechanism with an MCP Server for Financial Account Authority on AWS Lambda, API Gateway, Bedrock, Bedrock Knowledge Base, DynamoDB, S3, CloudWatch and scoped IAM roles.",
      "Shipped a root-cause-analysis tool inside the MCP Server that took ticket investigation from 10–11 days down to 1 minute 50 seconds.",
      "Automated developer environment setup as another MCP tool, replacing a 4-hour manual process with 20 minutes of scripted steps.",
    ],
    stack: [
      "AWS Lambda",
      "AWS Bedrock",
      "API Gateway",
      "DynamoDB",
      "S3",
      "CloudWatch",
      "IAM",
      "MCP",
    ],
  },
];

export const education: ExperienceItem[] = [
  {
    role: "B.E. Computer Science and Engineering",
    company: "Sri Sivasubramaniya Nadar College of Engineering",
    period: "Aug 2023 — Present",
    location: "Chennai, India",
    kind: "education",
    summary: "CGPA 8.594 / 10",
    points: [
      "Coursework across data structures, algorithms, operating systems, DBMS, computer networks and machine learning.",
      "Active across the campus tech community — IEEE, GDG and the SSN Coding Club.",
    ],
    stack: [],
  },
];

/** Positions of responsibility, shown alongside achievements. */
export const leadership = [
  {
    role: "Deputy Team Lead — Open Source Software",
    org: "SSN Coding Club",
    period: "2025",
  },
  {
    role: "Sub Head — App & Web Development",
    org: "Google Developers Group, SSN",
    period: "2025",
  },
  {
    role: "Secretary",
    org: "IEEE Student Branch, SSN",
    period: "2025",
  },
] as const;
