import type { SolutionSeed } from "./types";

/** Solutions, part 1 — linked to Finance and HR ideas. */
export const SOLUTIONS_A: SolutionSeed[] = [
  {
    key: "sol-fin-ap-01",
    name: "Missing-PO Invoice Intake Queue",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Checks every incoming invoice for a valid PO reference. If the PO is missing or the number doesn't match an open PO it files the invoice into the review queue folder and sends the buyer for that vendor a message with the invoice attached. Also logs how long each invoice waits in the queue so we can report on it at the end of the month.",
    resolvesKey: "fin-ap-01",
  },
  {
    key: "sol-fin-ap-05",
    name: "AP Inbox Triage Skill",
    artifactType: "skill",
    technologyType: "ChatGPT",
    rawDescription:
      "Reads the AP shared mailbox every morning and sorts the mail — vendor correspondence, statements, internal requests, junk — with a drafted next action for each item. The team clears the day from the clean list at standup.",
    resolvesKey: "fin-ap-05",
    neverReviewed: true,
  },
  {
    key: "sol-dup-a-1",
    name: "Dispute Response Starter Prompts",
    artifactType: "prompt",
    technologyType: "ChatGPT",
    rawDescription:
      "A set of reusable prompts for answering the usual dispute emails — pricing mismatch, quantity short, goods not received. You paste the customer email and it drafts a factual reply quoting our records. Kept in the team library so the wording stays consistent.",
    resolvesKey: "dup-a-1",
  },
  {
    key: "sol-dup-a-2",
    name: "Dispute Email Sorter",
    artifactType: "skill",
    technologyType: "AI + local automation",
    rawDescription:
      "Classifies the dispute emails customers send about their invoices — pricing, quantity short, goods not received, or other — and forwards each one to the analyst who owns that reason. Weekly counts by reason go to the team lead.",
    resolvesKey: "dup-a-2",
  },
  {
    key: "sol-fin-ar-01",
    name: "Overdue Invoice Dunning Drafter",
    artifactType: "prompt",
    technologyType: "ChatGPT",
    rawDescription:
      "Given the customer account and days overdue, drafts a dunning email at the right tone level (reminder, follow-up, final notice) with the open invoice table included. The collector reviews and sends. Escalation ladder matches our credit policy.",
    resolvesKey: "fin-ar-01",
    ownerDiffers: true,
  },
  {
    key: "sol-fin-fr-01",
    name: "Close Checklist Blockers View",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "The close checklist moved into a shared tracker. This script rolls up the tasks every 30 minutes and publishes a blockers-only view (late or blocked items) to the controller's channel. Everyone else sees the normal checklist.",
    resolvesKey: "fin-fr-01",
  },
  {
    key: "sol-hr-on-01",
    name: "New Hire Readiness Checklist",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Tracks laptops, badges, desks, and orientation bookings for each new hire across the three teams that own them, nudges whoever has an overdue item, and shows the hiring manager one progress bar. Replaces the three spreadsheets.",
    resolvesKey: "hr-on-01",
  },
  {
    key: "sol-hr-on-03",
    name: "Onboarding Task Orchestrator",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Turns the onboarding plan into dated tasks assigned to the right teams the moment a signed offer is recorded. Chases anything incomplete at day minus 5, minus 2, and day one, and reports to HR who was ready and who wasn't. Built to fix the general 'onboarding is disorganized' feedback with something measurable.",
    resolvesKey: "hr-on-03",
  },
  {
    key: "sol-hr-bn-01",
    name: "Enrollment FAQ Answerer",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Answers the routine open-enrollment questions (eligibility, tiers, deadlines) using the plan documents as the source, and if confidence is low it passes the question to the benefits inbox with the document references attached. Ran it through last enrollment season.",
    resolvesKey: "hr-bn-01",
    ownerDiffers: true,
  },
  {
    key: "sol-hr-rc-02",
    name: "Interview Feedback Consolidator",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "Paste in the interviewers' raw notes for a candidate and it returns one structured page: strengths, concerns, open questions, and any recommendation mismatches flagged. Used to prep debriefs.",
    resolvesKey: "hr-rc-02",
  },
  {
    key: "sol-hr-ld-03",
    name: "Meeting Actions Extractor",
    artifactType: "prompt",
    technologyType: "AI + local automation",
    rawDescription:
      "Reads the team's meeting notes, extracts every action item with its owner and due date, and pushes them straight to the shared task tracker. Posts a short summary of what it created so mistakes get caught.",
    resolvesKey: "hr-ld-03",
    cluster: "dup-meeting-actions",
  },
];
