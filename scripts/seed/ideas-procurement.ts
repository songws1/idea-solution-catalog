import type { IdeaSeed } from "./types";

/** Procurement Operations — all services. */
export const PROCUREMENT_IDEAS: IdeaSeed[] = [
  {
    key: "pr-vm-01",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Track vendor insurance certificate expiries",
    description:
      "Certificates of insurance lapse without anyone noticing until an audit. Extract the expiry dates from the certificates on file, keep a running watchlist, and alert the category manager 30 days out with a draft chaser to the vendor.",
    notes: "",
    status: "solved",
  },
  {
    key: "pr-vm-02",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Supplier onboarding data completeness check",
    description:
      "New supplier records routinely miss bank details, tax forms, or diversity certifications, which stalls the first purchase order. Validate each new record against the required field list at submission and return a single consolidated list of what's missing.",
    notes: "",
    status: "open",
  },
  {
    key: "dup-c-1",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Annual vendor risk reassessment reminders",
    description:
      "High-risk vendors are supposed to be reassessed every year, but it relies on someone remembering. Send scheduled reminders with the vendor's review history attached so the reviewer has context.",
    notes: "",
    status: "open",
    cluster: "dup-vendor-risk",
  },
  {
    key: "dup-c-2",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Vendor risk review scheduler",
    description:
      "Automate scheduling of annual vendor risk reviews: a quarterly queue, reminders to the category manager, and escalation to the procurement lead when a review goes overdue.",
    notes: "",
    status: "in_progress",
    cluster: "dup-vendor-risk",
    duplicateOfKey: "dup-c-1",
  },
  {
    key: "pr-po-01",
    org: "Procurement Operations",
    service: "Purchase Orders",
    title: "Blanket PO utilization report",
    description:
      "Show how much of each blanket purchase order has been consumed, what remains, and which are drifting past their validity window, so buyers can extend, close, or renegotiate before they expire unused.",
    notes: "",
    status: "open",
  },
  {
    key: "pr-po-02",
    org: "Procurement Operations",
    service: "Purchase Orders",
    title: "Spend dashboard",
    description: "Leadership keeps asking where spend is actually going. Something visual would help.",
    notes: "Repeated ask in ops reviews.",
    status: "solved",
    vague: true,
  },
  {
    key: "pr-po-03",
    org: "Procurement Operations",
    service: "Purchase Orders",
    title: "Low-value purchase consolidation candidates",
    description:
      "Find suppliers where we place many small purchase orders a month and estimate what a consolidated monthly order would save in processing time and freight.",
    notes: "",
    status: "open",
  },
  {
    key: "pr-ca-01",
    org: "Procurement Operations",
    service: "Contract Administration",
    title: "Contract renewal reminder cadence",
    description:
      "Send reminders at 90, 60, and 30 days before each contract's renewal or expiry date, with the contract owner, current spend, and the notice-period clause quoted so nobody gets auto-renewed by accident again.",
    notes: "",
    status: "solved",
  },
  {
    key: "pr-ca-02",
    org: "Procurement Operations",
    service: "Contract Administration",
    title: "Extract key clauses for contract review",
    description:
      "Pull the liability cap, termination rights, and auto-renewal clauses out of supplier contracts into a summary table, with the excerpt quoted, to speed up legal's first-pass review.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "pr-ca-03",
    org: "Procurement Operations",
    service: "Contract Administration",
    title: "Contract repository metadata audit",
    description:
      "Audit the repository for contracts missing owner, value, or expiry metadata, and produce a chase list per contract owner. Roughly a fifth of records are incomplete.",
    notes: "",
    status: "open",
  },
  {
    key: "pr-so-01",
    org: "Procurement Operations",
    service: "Sourcing & Analysis",
    title: "RFI response comparison matrix",
    description:
      "Take vendor responses to a standard RFI and lay them into a comparison matrix keyed to our question set, highlighting where a response is missing or doesn't address the question asked.",
    notes: "",
    status: "open",
  },
  {
    key: "pr-so-02",
    org: "Procurement Operations",
    service: "Sourcing & Analysis",
    title: "Vendor scorecards",
    description: "We should score our suppliers on something consistent instead of gut feel.",
    notes: "",
    status: "solved",
    vague: true,
  },
];
