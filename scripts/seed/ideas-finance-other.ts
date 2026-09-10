import type { IdeaSeed } from "./types";

/** Finance Operations — AR, Payroll, Financial Reporting, Employee Expenses. */
export const FINANCE_OTHER_IDEAS: IdeaSeed[] = [
  {
    key: "fin-ar-01",
    org: "Finance Operations",
    service: "Accounts Receivable",
    title: "Dunning email sequence for overdue invoices",
    description:
      "Chasing overdue invoices is manual and inconsistent: some customers get three calls, some get none. Draft a polite escalation sequence keyed to days overdue, personalized with the open invoice list, for a collector to review and send.",
    notes: "",
    status: "solved",
  },
  {
    key: "fin-ar-02",
    org: "Finance Operations",
    service: "Accounts Receivable",
    title: "Parse remittance advices for cash application",
    description:
      "Remittance advices arrive as PDFs, email bodies, and portal exports. Extract payer, references, and amounts into a standard table so cash application stops re-typing them.",
    notes: "Volume is roughly 400 advices a month.",
    status: "open",
  },
  {
    key: "fin-ar-03",
    org: "Finance Operations",
    service: "Accounts Receivable",
    title: "Credit hold flag for chronically late accounts",
    description:
      "Flag accounts whose last three invoices all went past 60 days so the team can decide on a credit hold before shipping the next order.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "fin-pr-01",
    org: "Finance Operations",
    service: "Payroll",
    title: "Alert on timesheets missing approval before the payroll cutoff",
    description:
      "Every cycle a handful of timesheets reach the cutoff without manager approval and cause off-cycle corrections. Send a digest of unapproved timesheets to managers two business days before cutoff, and escalate to the second-level manager on cutoff day.",
    notes: "",
    status: "open",
  },
  {
    key: "fin-pr-02",
    org: "Finance Operations",
    service: "Payroll",
    title: "Payroll questions never stop coming in",
    description: "Payroll gets the same questions every cycle. Make it easier for people to self-serve.",
    notes: "Verbal ask from the payroll lead.",
    status: "open",
    vague: true,
  },
  {
    key: "fin-fr-01",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "Month-end close checklist with a blockers view",
    description:
      "The close checklist lives in a spreadsheet that only one person can update safely. Move it into a shared tracker where each task has an owner and a due time, and give the controller a view of only the blocked or late items.",
    notes: "",
    status: "solved",
    // Planted with exp-fin-02 (v4.9.1), which asked for the same thing a year
    // later without anyone noticing this one was already built.
    cluster: "dup-close-checklist",
  },
  {
    key: "fin-fr-02",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "Pre-validate journal entries before posting",
    description:
      "Catch the common rejections early: unbalanced lines, closed periods, missing cost center, duplicate memo. A validation pass before posting would cut the rework loop with the accounting team.",
    notes: "",
    status: "open",
  },
  {
    key: "fin-fr-03",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "First-draft narrative for the monthly KPI pack",
    description:
      "Generate a first draft of the commentary that explains each KPI's movement against plan and prior year, with the key drivers listed, so analysts edit instead of compose. Explicitly a draft — the analyst owns the final wording.",
    notes: "Analysts spend a day a month on this today.",
    status: "open",
  },
  {
    key: "fin-x-01",
    org: "Finance Operations",
    service: "Employee Expenses",
    title: "Flag expense reports that violate policy before approval",
    description:
      "Check each expense report against policy rules — receipts above threshold, duplicate claims, non-flagged country limits — and show the approver a short plain-language list of what looks off instead of making them read the full report.",
    notes: "",
    status: "open",
  },
];
