import type { IdeaSeed } from "./types";

/**
 * Depth added to the five original services (v4.9).
 *
 * The UAT problem had two halves. One was breadth — nothing generic in the
 * catalog at all, which `ideas-general.ts` covers. The other was depth: each
 * service held eight to thirteen records, so a tester who typed a perfectly
 * ordinary request inside a service the catalog *did* cover still had a good
 * chance of hitting nothing, because that service's dozen records happened not
 * to include it.
 *
 * These fill in the obvious gaps a practitioner in each function would expect
 * to find. Several are deliberately near-neighbours of existing records rather
 * than new territory: a catalog where every record is unmistakably distinct is
 * not a catalog anyone needs, and the near-misses are what make a "related, but
 * not the same thing" verdict worth reading.
 */
export const EXPANSION_IDEAS: IdeaSeed[] = [
  // --- Finance Operations ---------------------------------------------------
  {
    key: "exp-fin-01",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Match card receipts to the statement automatically",
    description:
      "Expense claims are checked by opening the receipt images one at a time against the card statement. Match each receipt to a statement line on amount, date and merchant, and list the lines with no receipt and the receipts with no line.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-fin-02",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "Working month-end checklist that shows where we are",
    description:
      "Close is run from a spreadsheet that nobody updates until it is over, so during the week nobody can say what is done. A live checklist with an owner and a state per task, visible to the whole team.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fin-03",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "Chase intercompany balances that do not agree",
    description:
      "Each period a handful of intercompany balances disagree between entities and someone emails both sides to work out which is right. Identify the mismatched pairs, gather the supporting lines from each side, and send both contacts the same summary.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fin-04",
    org: "Finance Operations",
    service: "Financial Reporting",
    title: "Flag journal entries worth a second look",
    description:
      "Every entry gets the same cursory review. Rank them by the things that actually indicate risk — round numbers, posted late at night, unusual account pairs, an account the preparer has never touched — so review time goes where it matters.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-fin-05",
    org: "Finance Operations",
    service: "Accounts Receivable",
    title: "Draft the commentary that goes with the aging report",
    description:
      "The aging report is issued with a paragraph explaining the movements, written from scratch each month. Draft it from the data: which buckets moved, which accounts drove the movement, what was collected since last time.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "exp-fin-06",
    org: "Finance Operations",
    service: "Accounts Payable",
    title: "Assemble the approval pack for a payment run",
    description:
      "Before a payment run is approved the approver asks for the same supporting views every time. Assemble them into one pack — totals by vendor, anything above the usual amount, new bank details, items held from last run.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fin-07",
    org: "Finance Operations",
    service: "Payroll",
    title: "Check payroll changes against the previous run",
    description:
      "Errors in a payroll run are found after it has been paid. Compare this run with the last one, list every person whose pay changed and by how much, and separate the expected changes from the ones nobody can explain.",
    notes: "",
    status: "solved",
  },

  // --- HR Shared Services ---------------------------------------------------
  {
    key: "exp-hr-01",
    org: "HR Shared Services",
    service: "Employee Lifecycle",
    title: "Summarise exit interviews into themes",
    description:
      "Exit interviews are written up individually and then nobody reads them together, so the pattern across a year is invisible. Group them by theme and produce a quarterly summary with the wording kept anonymous.",
    notes: "Individual responses must not be identifiable.",
    status: "solved",
  },
  {
    key: "exp-hr-02",
    org: "HR Shared Services",
    service: "Benefits Administration",
    title: "Answer leave balance questions without a ticket",
    description:
      "A large share of the queue is people asking how much leave they have left and what happens to it at year end. Answer from the policy and the person's own balance, and hand over to a person when the case is not standard.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-hr-03",
    org: "HR Shared Services",
    service: "Recruiting Coordination",
    title: "Draft a job description from an existing one",
    description:
      "Hiring managers start from a document they found somewhere and the results are inconsistent. Draft from our template and the nearest previous role, keeping the required sections and our standard wording.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-hr-04",
    org: "HR Shared Services",
    service: "Employee Lifecycle",
    title: "Answer policy questions with the policy attached",
    description:
      "People ask what the policy says and get an answer in someone's own words, which is then quoted back at us later. Answer from the current policy documents and always show the passage the answer came from.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-hr-05",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Chase outstanding mandatory training",
    description:
      "Completion chasing is done by exporting a report and sending manual reminders. Work out who is outstanding, send each person their own list, and send managers a summary for their team.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-hr-06",
    org: "HR Shared Services",
    service: "Employee Lifecycle",
    title: "Check a case file has everything policy requires",
    description:
      "Before an employee relations case is closed, the file is checked for the required forms, approvals and notes. It is done from memory and different people check different things. Report what is present, what is missing and what is out of sequence.",
    notes: "Says what is absent; the decision stays with the case owner.",
    status: "open",
  },
  {
    // Planted near-duplicate of gen-mtg-01, in a different service (v4.9).
    // This is the duplication the product exists to catch and the one the old
    // dataset could not demonstrate: two teams independently asking for the
    // same generic capability, neither aware of the other, because neither
    // thought to look outside their own function.
    key: "exp-hr-08",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Write up our meetings without anyone taking minutes",
    description:
      "Nobody wants to be the person taking minutes, so meetings go unrecorded and the actions are remembered differently a week later. From the recording, produce a short write-up with the decisions and a list of who agreed to do what by when.",
    notes: "",
    status: "solved",
    cluster: "gen-notes",
  },
  {
    key: "exp-hr-07",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "Produce the offer paperwork from the approved requisition",
    description:
      "Offer documents are assembled by copying from the requisition into three templates, which is slow and occasionally wrong. Generate the set from the approved requisition and hold it for a person to check before it goes out.",
    notes: "",
    status: "open",
  },

  // --- Procurement Operations ----------------------------------------------
  {
    key: "exp-pro-01",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Triage supplier risk questionnaires",
    description:
      "Completed questionnaires arrive as long documents and each is read end to end. Extract the answers that matter, compare them against our thresholds, and put forward only the ones that need a human decision.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-pro-02",
    org: "Procurement Operations",
    service: "Contract Administration",
    title: "Compare a supplier's contract against our standard",
    description:
      "Redlines come back and someone reads both documents side by side looking for what moved. List the clauses that differ from our standard terms, say how, and rank them by how far they sit outside what we normally accept.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-pro-03",
    org: "Procurement Operations",
    service: "Sourcing & Analysis",
    title: "Score RFP responses against the same criteria",
    description:
      "Responses are scored by different evaluators who weigh things differently. Pull each response's answer to each criterion into one comparable view so the panel discusses the same evidence.",
    notes: "Scoring stays with the panel.",
    status: "open",
  },
  {
    key: "exp-pro-04",
    org: "Procurement Operations",
    service: "Purchase Orders",
    title: "Alert on catalog price changes",
    description:
      "Suppliers change catalog prices and we notice at invoice time. Compare each new price file against the agreed rates and flag anything that moved beyond the tolerance in the contract.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-pro-05",
    org: "Procurement Operations",
    service: "Purchase Orders",
    title: "Weekly exception report for open purchase orders",
    description:
      "Problem POs are found when someone complains. Produce a weekly list of the ones that need attention — received but not invoiced, invoiced above the order, open past the expected date, no receipt recorded.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "exp-pro-06",
    org: "Procurement Operations",
    service: "Vendor Management",
    title: "Assemble the supplier onboarding pack",
    description:
      "Onboarding a supplier means collecting the same documents in the same order and chasing whatever is missing. Track what has been received, chase what has not, and hand over a complete pack when it is done.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-pro-07",
    org: "Procurement Operations",
    service: "Spend Analysis",
    title: "Map free-text spend descriptions to categories",
    description:
      "Spend arrives described in whatever words the requester used, so category reporting is unreliable. Assign a category from the description and the supplier, and show the low-confidence ones for review rather than guessing quietly.",
    notes: "",
    status: "solved",
  },

  // --- Facilities Support ---------------------------------------------------
  {
    key: "exp-fac-01",
    org: "Facilities Support",
    service: "Maintenance Requests",
    title: "Route work orders from the photo people attach",
    description:
      "Requests arrive with a photo and a sentence, and someone decides the trade and the priority. Read the photo and the text together, propose the trade and urgency, and let the coordinator confirm.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-fac-02",
    org: "Facilities Support",
    service: "Space Planning",
    title: "Report on rooms booked and never used",
    description:
      "Rooms are booked and not used while people say they cannot find one. Compare bookings against occupancy and produce a weekly list of the rooms held and left empty.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fac-03",
    org: "Facilities Support",
    service: "Reception Services",
    title: "Route badge and access requests to the right approver",
    description:
      "Access requests arrive at reception and are forwarded by hand, often to the wrong approver first. Work out the area, find its owner, and send it there with what the approver needs to decide.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fac-04",
    org: "Facilities Support",
    service: "Mail & Logistics",
    title: "Reconcile courier invoices against what we sent",
    description:
      "Courier invoices are paid without checking because comparing them to the despatch log takes a day. Match invoice lines to despatch records and list the charges with nothing behind them.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-fac-05",
    org: "Facilities Support",
    service: "Maintenance Requests",
    title: "Summarise the incident log for the monthly review",
    description:
      "The incident log is read line by line before the monthly meeting. Group the entries by type and location, note the repeats, and draft the summary the meeting actually discusses.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fac-06",
    org: "Facilities Support",
    service: "Parking & Commute",
    title: "Fair way to allocate the parking waitlist",
    description:
      "Parking spaces are allocated by whoever asks loudest. Apply the stated rules consistently, produce the allocation, and be able to show why each person is where they are on the list.",
    notes: "",
    status: "open",
  },

  // --- IT Service Delivery --------------------------------------------------
  {
    key: "exp-it-01",
    org: "IT Service Delivery",
    service: "Software Provisioning",
    title: "Forecast licence needs from actual usage",
    description:
      "Licences are renewed at whatever count we bought last time. Look at who has actually used each product in the last quarter and forecast what we need, separating never-used from lightly-used.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-it-02",
    org: "IT Service Delivery",
    service: "Self-Service",
    title: "Deflect the most common self-service requests",
    description:
      "A large share of tickets are things the user could do themselves if they knew how. Recognise those at intake and offer the steps, while keeping a one-click path to a human for anyone who wants one.",
    notes: "The escape hatch to a person must be obvious.",
    status: "open",
  },
  {
    key: "exp-it-03",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Draft the change record from the ticket",
    description:
      "Change records are written after the fact and are thin, which makes the audit harder than it needs to be. Draft the record from the ticket and the work notes, leaving the risk assessment to the engineer.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-it-04",
    org: "IT Service Delivery",
    service: "Asset Management",
    title: "Produce disposal certificates for retired hardware",
    description:
      "Every retired device needs a certificate with the asset details and the wipe evidence, produced by hand. Generate them from the asset record and the wipe log, and flag any device where the evidence is missing.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-it-05",
    org: "IT Service Delivery",
    service: "Software Provisioning",
    title: "Check software requests against policy before approval",
    description:
      "Requests for software reach an approver who has to remember what is permitted. Check the request against the approved list and the licence terms, and put forward only the ones that need judgement.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "exp-it-06",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Build the incident timeline for the review",
    description:
      "After a major incident someone reconstructs the timeline from tickets, chat and monitoring, which takes longer than the incident did. Assemble the sequence from those sources so the review starts from an agreed account of what happened.",
    notes: "",
    status: "open",
  },
];
