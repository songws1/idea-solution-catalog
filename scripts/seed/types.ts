export interface IdeaSeed {
  /** Stable key used to wire solution links before ids exist. */
  key: string;
  org: string;
  service: string;
  title: string;
  description: string;
  notes: string;
  status: "open" | "in_progress" | "solved";
  /** Planted near-duplicate cluster annotation — ground truth for verify-duplicates. */
  cluster?: string;
  /** Key of the record this one is a confirmed (human-validated) duplicate of. */
  duplicateOfKey?: string;
  /** True for deliberately vague, one-line submissions (description-quality variance). */
  vague?: boolean;
}

/** Fixed technology_type vocabulary (Addendum A §1.3) — Chris-approved list. */
export const TECHNOLOGY_TYPES = [
  "ChatGPT",
  "Claude",
  "AI + RPA",
  "AI + local automation",
  "Local automation",
  "RPA",
  "Process improvement",
  "Other",
] as const;

export type TechnologyType = (typeof TECHNOLOGY_TYPES)[number];

export interface SolutionSeed {
  key: string;
  name: string;
  artifactType: "prompt" | "skill" | "automation";
  /** Underlying tool/platform used to build it — factual, set here at seed time (Addendum A §1.3). */
  technologyType: TechnologyType;
  /** What the citizen developer wrote when saving the artifact — varied in quality. */
  rawDescription: string;
  /** Key of the idea this solution resolves. Omit for orphan solutions. */
  resolvesKey?: string;
  /** solution_owner differs from built_by. */
  ownerDiffers?: boolean;
  /** Never had a last-reviewed date. */
  neverReviewed?: boolean;
  /** Solution with no linked idea (historical/unlinked gap case). */
  orphan?: boolean;
  cluster?: string;
  duplicateOfKey?: string;
}

export const ORGS: Record<string, string[]> = {
  "Finance Operations": [
    "Accounts Payable",
    "Accounts Receivable",
    "Payroll",
    "Financial Reporting",
  ],
  "HR Shared Services": [
    "Employee Onboarding",
    "Benefits Administration",
    "Recruiting Coordination",
    "Learning & Development",
  ],
  "Procurement Operations": [
    "Vendor Management",
    "Purchase Orders",
    "Contract Administration",
    "Sourcing & Analysis",
  ],
  "Facilities Support": [
    "Space Planning",
    "Maintenance Requests",
    "Mail & Logistics",
    "Reception Services",
  ],
  "IT Service Delivery": [
    "Service Desk",
    "Access Management",
    "Software Provisioning",
    "Asset Management",
  ],
  /**
   * Cross-functional service (v4.9). Not a department — the capabilities every
   * function reaches for, which is where a shared-services org duplicates work
   * most and where the catalog previously held nothing at all. Added after UAT
   * testers typed ordinary requests ("a PDF editor", "track a small project")
   * and got an accurate empty answer they could not distinguish from a broken
   * search.
   */
  "General Business Process": [
    "Document Handling",
    "Meetings & Coordination",
    "Reporting & Analysis",
    "Drafting & Review",
  ],
};

/** Extra service for one-off ideas that don't sit in the main service list. */
export const EXTRA_SERVICES: Record<string, string> = {
  "Finance Operations": "Employee Expenses",
  "Facilities Support": "Parking & Commute",
  "IT Service Delivery": "Self-Service",
  "HR Shared Services": "Employee Lifecycle",
  "Procurement Operations": "Spend Analysis",
  "General Business Process": "Knowledge & Search",
};
