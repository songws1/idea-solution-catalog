import type { IdeaSeed } from "./types";

/** HR Shared Services — Benefits, Recruiting, L&D, Employee Lifecycle. */
export const HR_OTHER_IDEAS: IdeaSeed[] = [
  {
    key: "hr-bn-01",
    org: "HR Shared Services",
    service: "Benefits Administration",
    title: "Open enrollment FAQ assistant",
    description:
      "During open enrollment the benefits inbox drowns. Answer the common plan questions — eligibility, contribution tiers, deadlines — from the plan documents, and hand anything unusual to a human with the question and context attached.",
    notes: "",
    status: "solved",
  },
  {
    key: "hr-bn-02",
    org: "HR Shared Services",
    service: "Benefits Administration",
    title: "Benefits election anomaly report",
    description:
      "Flag suspicious elections: family coverage with no dependents declared, contributions outside allowed bands, elections for employees who left mid-cycle. Give the analyst the record and the reason side by side.",
    notes: "",
    status: "open",
  },
  {
    key: "hr-bn-03",
    org: "HR Shared Services",
    service: "Benefits Administration",
    title: "Dependent document chase list",
    description:
      "Dependent verification documents go missing constantly. Generate a weekly chase list of what is outstanding, from whom, and since when, with a draft reminder email ready per person.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "hr-rc-01",
    org: "HR Shared Services",
    service: "Recruiting Coordination",
    title: "Panel availability grid for interview scheduling",
    description:
      "Collect interviewer availability into one grid so coordinators stop playing email tennis across five calendars. Show open slots where the full panel overlaps.",
    notes: "",
    status: "open",
  },
  {
    key: "hr-rc-02",
    org: "HR Shared Services",
    service: "Recruiting Coordination",
    title: "Consolidate interviewer feedback before the debrief",
    description:
      "Interviewers submit notes in every format imaginable. Pull them together into a structured summary per candidate — strengths, concerns, open questions — so the debrief starts from one page instead of five half-filled forms.",
    notes: "",
    status: "solved",
  },
  {
    key: "hr-ld-01",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Nudge emails for overdue mandatory training",
    description:
      "Send friendly, personalized reminders for overdue mandatory training with a direct link to the course, weekly until complete. Compliance chases manually today and it eats a day a week.",
    notes: "",
    status: "open",
  },
  {
    key: "hr-ld-02",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Skill gap summary from team self-assessments",
    description:
      "Aggregate the annual self-assessments into a per-team skill gap summary the L&D partner can take to planning, with the top three gaps called out and the evidence behind them.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "hr-ld-03",
    org: "HR Shared Services",
    service: "Learning & Development",
    title: "Turn meeting notes into tracked actions",
    description:
      "Workshops and review meetings produce pages of notes and no follow-through. Convert notes into a list of actions with owners and dates that can be pasted into the tracker, so decisions actually get done.",
    notes: "",
    status: "solved",
    cluster: "dup-meeting-actions",
  },
  {
    key: "hr-x-01",
    org: "HR Shared Services",
    service: "Employee Lifecycle",
    title: "Quarterly themes digest from exit interviews",
    description:
      "Read the quarter's exit interviews and produce a short themes digest — top reasons for leaving, any manager or team patterns, suggested actions — for the HR leadership meeting.",
    notes: "Sensitive: keep the digest at theme level, never quote individuals.",
    status: "open",
  },
];
