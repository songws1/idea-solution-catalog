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
 *
 * v4.9.1: eight of these were not near-neighbours, they were the same record
 * written twice. They were authored without checking the existing 63, and the
 * first enrich run's false-positive list named every one. Four of the collisions
 * were kept and declared as planted clusters, because a want expressed twice by
 * different teams is realistic and is exactly what the flag is for. The other
 * eight were rewritten onto subjects the catalog genuinely lacked, because an
 * accidental restatement adds a duplicate without adding coverage — the
 * opposite of the point of this file.
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
    // Planted with fin-fr-01 (v4.9.1) — same want, one already solved.
    cluster: "dup-close-checklist",
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
    // Planted with hr-x-01 (v4.9.1). Written without noticing hr-x-01 already
    // asked for it; kept rather than rewritten, because a request made twice
    // inside one service is realistic and is what the flag is for.
    cluster: "dup-exit-themes",
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
    title: "Retire training courses nobody takes any more",
    description:
      "The course catalogue only ever grows. Some courses still reference systems we retired years ago and some have had no enrolments in eighteen months, but nobody has the list. Report enrolment and completion per course over a rolling period and flag the ones that look dead so they can be withdrawn or rewritten.",
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
    cluster: "dup-case-file",
  },
  {
    // Fourth member of the meeting-write-up cluster (v4.9.1): hr-ld-03,
    // it-sd-04, gen-mtg-01 and this one. Four teams, four requests, one want.
    key: "exp-hr-08",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Write up our meetings without anyone taking minutes",
    description:
      "Nobody wants to be the person taking minutes, so meetings go unrecorded and the actions are remembered differently a week later. From the recording, produce a short write-up with the decisions and a list of who agreed to do what by when.",
    notes: "",
    status: "solved",
    cluster: "dup-meeting-actions",
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
    title: "Find the same supplier recorded under several names",
    description:
      "The same company sits in the system three times with different spellings, a trading name and a legacy account, which splits our spend with them and weakens every negotiation. Group the records that are plainly the same company and put them forward for a human to confirm before anything is merged.",
    notes: "Nothing merges automatically.",
    status: "open",
  },
  {
    key: "exp-pro-07",
    org: "Procurement Operations",
    service: "Spend Analysis",
    title: "Show where we pay different prices for the same thing",
    description:
      "The same item is bought by several sites at prices nobody compares, so we negotiate without knowing our own position. Line up the same item across suppliers and sites, show the spread, and put the largest gaps at the top.",
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
    title: "Plan a floor move without a fortnight of spreadsheets",
    description:
      "Moving a team between floors currently means a spreadsheet of who sits where, redrawn by hand every time someone objects. Take the current seating, the constraints that actually matter — team adjacency, accessibility needs, fixed equipment — and produce a proposed layout that can be adjusted and re-run.",
    notes: "",
    status: "open",
  },
  {
    key: "exp-fac-03",
    org: "Facilities Support",
    service: "Reception Services",
    title: "Know who is actually in the building for a roll call",
    description:
      "In an evacuation the roll call is assembled from three separate lists that never agree, and contractors are usually on none of them. Maintain one live count of who is on site — staff, visitors, contractors — that the fire marshals can read from a phone.",
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
    title: "Tell people how to get in when their usual route is disrupted",
    description:
      "When a line is down or a road is closed, people find out at the station. Watch the transport feeds for the routes our sites actually depend on and send an early-morning note to the affected sites with the alternatives that work.",
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
    title: "Find the devices that have gone quiet",
    description:
      "Machines that have not checked in for months are still counted as in service, so the numbers are wrong and nobody chases the ones that walked out of the building. List the devices with no contact for a set period alongside who last held them.",
    notes: "",
    status: "solved",
  },
  {
    key: "exp-it-05",
    org: "IT Service Delivery",
    service: "Software Provisioning",
    title: "Say when a requested tool overlaps one we already pay for",
    description:
      "People request a product without knowing we already licence something that does the same job, so we end up paying twice for overlapping capability. When a request arrives, say what we already hold that covers it and who to talk to about getting a seat.",
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
