import type { SolutionSeed } from "./types";

/** Solutions, part 2 — linked to Procurement, Facilities, and IT ideas, plus two orphans. */
export const SOLUTIONS_B: SolutionSeed[] = [
  {
    key: "sol-pr-vm-01",
    name: "COI Expiry Watchlist",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Reads the certificates of insurance on file, extracts the expiry dates, and maintains a watchlist. Thirty days out it emails the category manager with a draft chaser for the vendor. Daily refresh.",
    resolvesKey: "pr-vm-01",
  },
  {
    key: "sol-pr-po-02",
    name: "Spend Category Summarizer",
    artifactType: "skill",
    technologyType: "ChatGPT",
    rawDescription:
      "Point it at a quarterly spend extract and it produces the leadership view: spend by category and org, the big movers, and three things worth asking about. Built after the ops review asked for 'something visual' one time too many.",
    resolvesKey: "pr-po-02",
    neverReviewed: true,
  },
  {
    key: "sol-pr-ca-01",
    name: "Renewal Reminder Cadence",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Watches contract expiry dates and sends reminders at 90, 60, and 30 days to the contract owner with current spend and the notice-period clause quoted. No more accidental auto-renewals.",
    resolvesKey: "pr-ca-01",
    ownerDiffers: true,
  },
  {
    key: "sol-pr-so-02",
    name: "Vendor Scorecard Builder",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "Generates a scorecard per supplier from the standard criteria (quality, delivery, responsiveness, commercial) using the data you feed it, and writes a short justification for each score. Draft only — the category manager signs off.",
    resolvesKey: "pr-so-02",
  },
  {
    key: "sol-fa-sp-02",
    name: "Room Booking Reconciliation Script",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Twice a day it compares calendar bookings against actual room sensor occupancy. No-show rooms get released back to the bookable pool automatically, and there is a weekly report of repeat no-show organizers. Made a real dent in the 'no rooms' complaints.",
    resolvesKey: "fa-sp-02",
  },
  {
    key: "sol-fa-mt-01",
    name: "PM Backlog Ranker",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Re-ranks the open preventive maintenance list every morning by asset criticality, warranty state, and wait time, and pushes the ordered list to the technicians' tablets. Backlog order is now defensible when the auditors ask.",
    resolvesKey: "fa-mt-01",
    ownerDiffers: true,
  },
  {
    key: "sol-it-sd-01",
    name: "Ticket Triage Suggester",
    artifactType: "skill",
    technologyType: "ChatGPT",
    rawDescription:
      "Suggests category and queue for each new ticket from its text. Agent confirms or overrides with one click. Acceptance rate is logged weekly so we know if it's actually helping.",
    resolvesKey: "it-sd-01",
  },
  {
    key: "sol-it-sd-03",
    name: "Service Desk Queue Router",
    artifactType: "skill",
    technologyType: "AI + local automation",
    rawDescription:
      "Looks at untouched tickets in the queue, figures out who should own them based on past resolution patterns, and assigns them with a suggested first response. Goal was simple: nothing sits untouched for hours.",
    resolvesKey: "it-sd-03",
    neverReviewed: true,
  },
  {
    key: "sol-it-sd-04",
    name: "Minutes-to-Tasks Bot",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Reads the team's meeting notes, extracts every action item with its owner and due date, and pushes them straight to the shared task tracker. Posts a short summary of what it created so mistakes get caught.",
    resolvesKey: "it-sd-04",
    cluster: "dup-meeting-actions",
  },
  {
    key: "sol-it-am-02",
    name: "Leaver Access Sweep Script",
    artifactType: "automation",
    technologyType: "RPA",
    rawDescription:
      "Runs the revocation checklist per leaver across all connected systems — disable, transfer ownership, archive — timestamps each step, and sends HR the completion confirmation.",
    resolvesKey: "it-am-02",
    ownerDiffers: true,
  },
  {
    key: "sol-it-am-03",
    name: "Access Request Auto-Approver",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Auto-approves access requests that match a standard role template (baseline software, read-only dashboards), keeping the requester's manager cc'd. Anything outside a template goes to a human queue with the mismatch explained.",
    resolvesKey: "it-am-03",
    cluster: "dup-access",
  },
  {
    key: "sol-it-sp-02",
    name: "Software Request Routing Assistant",
    artifactType: "skill",
    technologyType: "Local automation",
    rawDescription:
      "Works out which approvals a software purchase needs — license owner, security review, budget holder — and forwards the request to the first required approver with the justification and cost attached.",
    resolvesKey: "it-sp-02",
  },
  {
    key: "sol-orphan-access",
    name: "Access Grant Script",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Grants access automatically when the request matches a standard role template (baseline software, read-only dashboards). The requester's manager is notified. Anything outside a template goes to a human queue.",
    orphan: true,
    cluster: "dup-access",
    duplicateOfKey: "sol-it-am-03",
    neverReviewed: true,
  },
  {
    key: "sol-orphan-supply",
    name: "Supply Reorder Reminder",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Checks stationery and kitchen stock counts weekly and posts a reorder list to the facilities channel when anything drops under par. Built informally during the office move, kept running since.",
    orphan: true,
  },
];
