import type { IdeaSeed } from "./types";

/** Finance Operations — Accounts Payable. */
export const FINANCE_AP_IDEAS: IdeaSeed[] = [
  {
    key: "fin-ap-01",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Route invoices with missing PO numbers to a review queue",
    description:
      "Invoices that arrive without a valid PO reference currently get forwarded by email until someone claims them. Detect missing or mismatched PO numbers at intake, park the invoice in a shared review queue, and notify the buyer who owns the vendor. Track queue dwell time so we can finally report on it.",
    notes: "Discussed at the March AP team meeting. Buyers want to keep final say.",
    status: "solved",
  },
  {
    key: "fin-ap-02",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Standard triage checklist for three-way match exceptions",
    description:
      "When quantity, goods receipt, and invoice don't line up, every analyst works from memory. Put a standard triage checklist into the workflow tool so exceptions are handled consistently and we can measure which causes recur.",
    notes: "Came out of the July retro.",
    status: "open",
  },
  {
    key: "fin-ap-03",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Vendor statement versus ledger reconciliation helper",
    description:
      "Pull the monthly vendor statement and our ledger extract and flag lines that don't reconcile, instead of eyeballing two spreadsheets side by side for an afternoon.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "fin-ap-04",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Duplicate payment early warning before the payment run",
    description:
      "Surface suspected duplicate payments before the weekly run: same vendor, similar amount, close invoice dates. A reviewer confirms before anything is actually blocked — the flag is advisory.",
    notes: "Two near-misses last quarter made this urgent.",
    status: "open",
  },
  {
    key: "fin-ap-05",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Make invoice handling faster",
    description: "Invoice processing is slow end to end. Find the bottlenecks and speed it up.",
    notes: "Raised in the ops standup. No specifics yet — happy to demo anything that helps.",
    status: "solved",
    vague: true,
  },
  {
    key: "dup-a-1",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Handle invoice disputes better",
    description: "Disputes sit in the shared inbox for days. Fix it.",
    notes: "",
    status: "solved",
    cluster: "dup-invoice-disputes",
    vague: true,
  },
  {
    key: "dup-a-2",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Sort dispute emails by reason code",
    description:
      "We get hundreds of dispute emails a month. Sort them into buckets — pricing, quantity, delivery, other — so the right analyst picks them up faster.",
    notes: "",
    status: "solved",
    cluster: "dup-invoice-disputes",
  },
  {
    key: "dup-a-3",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Automated triage of the invoice dispute inbox",
    description:
      "Build a classifier for the AP dispute inbox that reads each email, assigns a dispute reason (pricing mismatch, quantity short, goods not received, other), routes it to the owning analyst, and starts a response SLA clock. Monthly report of volume by reason so we can attack the top cause.",
    notes: "Submitted after the third quarter in a row where dispute aging came up in review.",
    status: "open",
    cluster: "dup-invoice-disputes",
  },
];
