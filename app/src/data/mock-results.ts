// Mock results data for the prototype
// In production, this would be calculated from O*NET data + AI exposure scoring

export interface TaskExposure {
  name: string;
  timePercent: number;
  exposureLevel: "high" | "medium" | "low";
  description: string;
}

export interface CareerPath {
  id: string;
  socCode?: string; // O*NET SOC code for real recommendations
  title: string;
  riskScore: number;
  skillsMatch: number;
  growthOutlook: "High" | "Moderate" | "Low";
  salaryRange: string;
  description: string;
  skillsToLearn: string[];
  currentSkillsApplicable: string[];
}

export interface AssessmentResults {
  occupation: string;
  industry: string;
  riskScore: number;
  confidenceRange: [number, number];
  scenarioScores: {
    slow: number;
    rapid: number;
  };
  taskBreakdown: {
    highExposure: number;
    mediumExposure: number;
    lowExposure: number;
  };
  tasks: TaskExposure[];
  keyInsight: string;
  protectedSkills: string[];
  vulnerableSkills: string[];
  careerPaths: CareerPath[];
}

export const mockResults: AssessmentResults = {
  occupation: "Marketing Coordinator",
  industry: "Technology",
  riskScore: 58,
  confidenceRange: [52, 64],
  scenarioScores: {
    slow: 48,
    rapid: 72,
  },
  taskBreakdown: {
    highExposure: 35,
    mediumExposure: 40,
    lowExposure: 25,
  },
  tasks: [
    {
      name: "Report Generation & Data Compilation",
      timePercent: 20,
      exposureLevel: "high",
      description:
        "Pulling data, creating dashboards, formatting reports. AI tools are getting very good at this.",
    },
    {
      name: "Content Drafting & Copywriting",
      timePercent: 15,
      exposureLevel: "high",
      description:
        "First drafts of emails, social posts, marketing copy. LLMs can produce decent first drafts quickly.",
    },
    {
      name: "Campaign Analytics & Optimization",
      timePercent: 25,
      exposureLevel: "medium",
      description:
        "Analyzing performance, identifying trends. AI assists but human judgment still critical.",
    },
    {
      name: "Cross-Team Coordination",
      timePercent: 15,
      exposureLevel: "medium",
      description:
        "Managing timelines, aligning stakeholders. Requires interpersonal skills AI can't replicate.",
    },
    {
      name: "Client & Stakeholder Communication",
      timePercent: 15,
      exposureLevel: "low",
      description:
        "Building relationships, understanding needs, navigating politics. Highly human skills.",
    },
    {
      name: "Strategy & Creative Direction",
      timePercent: 10,
      exposureLevel: "low",
      description:
        "Big-picture thinking, creative problem-solving. This is your competitive advantage.",
    },
  ],
  keyInsight:
    "About 35% of your time involves high-exposure tasks like report generation and content drafting—things AI is getting good at fast. But your client relationship work and strategic thinking? That's your moat. The question is how to shift your role toward more of the protected work.",
  protectedSkills: [
    "Client relationship management",
    "Strategic thinking",
    "Cross-functional collaboration",
    "Stakeholder communication",
    "Creative problem-solving",
  ],
  vulnerableSkills: [
    "Report formatting",
    "Data compilation",
    "First-draft copywriting",
    "Basic analytics",
    "Scheduling & coordination",
  ],
  careerPaths: [
    {
      id: "path-1",
      title: "Marketing Strategy Lead",
      riskScore: 38,
      skillsMatch: 72,
      growthOutlook: "High",
      salaryRange: "$85K - $130K",
      description:
        "Move up the strategic ladder. Less execution, more direction-setting and client advisory.",
      skillsToLearn: [
        "Business strategy frameworks",
        "Executive presentation",
        "P&L management basics",
      ],
      currentSkillsApplicable: [
        "Client relationships",
        "Campaign knowledge",
        "Cross-team coordination",
      ],
    },
    {
      id: "path-2",
      title: "Product Marketing Manager",
      riskScore: 42,
      skillsMatch: 68,
      growthOutlook: "High",
      salaryRange: "$90K - $140K",
      description:
        "Bridge between product and market. High on strategy and customer insight, low on routine tasks.",
      skillsToLearn: [
        "Product management basics",
        "Competitive analysis",
        "Go-to-market strategy",
      ],
      currentSkillsApplicable: [
        "Marketing fundamentals",
        "Analytics understanding",
        "Stakeholder management",
      ],
    },
    {
      id: "path-3",
      title: "AI Marketing Specialist",
      riskScore: 35,
      skillsMatch: 65,
      growthOutlook: "High",
      salaryRange: "$80K - $120K",
      description:
        "Become the person who implements AI tools for marketing teams. High demand, growing field.",
      skillsToLearn: [
        "AI/ML fundamentals",
        "Marketing automation platforms",
        "Prompt engineering",
      ],
      currentSkillsApplicable: [
        "Marketing workflows",
        "Tool evaluation",
        "Process optimization",
      ],
    },
  ],
};
