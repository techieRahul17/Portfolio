import type { SocialLink } from "@/types";

/**
 * Single source of truth for "who Rahul is".
 * Nav, hero, footer, SEO and OG tags all read from here.
 */
export const profile = {
  name: "Rahul V S",
  shortName: "Rahul",
  /** Split for the oversized hero type. */
  nameParts: ["RAHUL", "V S"],
  role: "Frontend Developer",
  /** Rotates under the hero headline. */
  roles: [
    "Creative Frontend Developer",
    "Three.js & WebGL",
    "GSAP Motion",
    "Full-Stack Builder",
    "Hackathon Winner",
  ],
  headline: "Frontend developer building 3D, motion-driven interfaces with Three.js and GSAP.",
  tagline:
    "Fourth-year CSE undergrad at SSN. I make interfaces people remember — and the systems under them, like an MCP tool at Amazon that took root-cause analysis from 11 days to under 2 minutes.",
  bio: [
    "I'm a fourth-year Computer Science undergrad at SSN College of Engineering, Chennai, and I like problems where the win is measurable. At Amazon I built an MCP server for Financial Account Authority that turned an 11-day root-cause investigation into a 1 minute 50 second query, and replaced a 4-hour manual dev-environment setup with 20 minutes of automation.",
    "Since then I've shipped payments and infrastructure at Invesho AI, piloted a campus-wide attendance platform in my own department, and won three hackathons and project expos with teams I loved building with.",
    "On the front end I work in React, Next.js, Three.js and GSAP — particle scenes and scroll choreography that make an interface feel alive. Behind it I'm comfortable in Java Spring Boot, FastAPI and AWS, so the thing that moves beautifully also holds up.",
  ],
  location: "Chennai, India",
  /** IANA zone, for the live clock in the footer. */
  timezone: "Asia/Kolkata",
  email: "vsrahul2006@gmail.com",
  phone: "+91 63832 81491",
  availableForWork: true,
  availabilityNote: "Open to frontend & SDE roles",
  resumeUrl: "/resume/Rahul_V_S_Resume.pdf",
  /* Lowercase filename on purpose: Vercel's filesystem is case-sensitive, so
     `Rahl.JPG` referenced as `.jpg` builds locally and 404s in production. */
  avatar: "/images/rahul.jpg",
  university: "SSN College of Engineering",
  degree: "B.E. Computer Science and Engineering",
  gradYear: "2027",
  cgpa: "8.594",
} as const;

export const socials: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/techieRahul17", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/rahul-v-s/", icon: "linkedin" },
  { label: "Email", href: `mailto:${profile.email}`, icon: "mail" },
  { label: "Résumé", href: profile.resumeUrl, icon: "resume" },
];

/** The four numbers worth leading with. Counters animate to `value`. */
export const stats = [
  { value: 8.594, suffix: "", decimals: 3, label: "CGPA", sub: "out of 10 at SSN" },
  { value: 3, suffix: "×", decimals: 0, label: "Wins", sub: "hackathons & expos" },
  { value: 1254, suffix: "", decimals: 0, label: "Global rank", sub: "IEEE Xtreme 18.0" },
  { value: 11, suffix: "d → 2m", decimals: 0, label: "RCA time", sub: "cut at Amazon" },
] as const;
