import type { IdeaSeed } from "./types";

/** HR Shared Services — Employee Onboarding. */
export const HR_ONBOARDING_IDEAS: IdeaSeed[] = [
  {
    key: "hr-on-01",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "One checklist for new hire equipment, access, and orientation",
    description:
      "Equipment, system access, and orientation bookings are tracked in three places by three teams, and something is always late. One shared checklist per new hire, with each team owning its own items and a single progress bar the hiring manager can see.",
    notes: "",
    status: "solved",
  },
  {
    key: "hr-on-02",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "Buddy program matching helper",
    description:
      "Suggest a buddy for each new joiner based on shared service line and time zone, and track which matches actually met. The pairings today are whoever the coordinator remembers.",
    notes: "",
    status: "open",
  },
  {
    key: "hr-on-03",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "Better onboarding",
    description: "Our onboarding feels disorganized to new starters. Make it better.",
    notes: "From the quarterly engagement survey comment section.",
    status: "solved",
    vague: true,
  },
  {
    key: "dup-b-1",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "Collect new hire documents before day one",
    description:
      "Right now we chase ID documents, tax forms, and signed policy acknowledgments by email after the person has already started. Collect all the pre-employment paperwork through a single intake before the start date, and automatically chase whatever is missing.",
    notes: "",
    status: "open",
    cluster: "dup-newhire-docs",
  },
  {
    key: "dup-b-2",
    org: "HR Shared Services",
    service: "Employee Onboarding",
    title: "Pre-start paperwork intake automation",
    description:
      "Automate collecting the pre-employment paperwork — ID documents, tax forms, signed policy acknowledgments — through a single intake before the start date, and automatically chase whatever is missing.",
    notes: "",
    status: "in_progress",
    cluster: "dup-newhire-docs",
  },
];
