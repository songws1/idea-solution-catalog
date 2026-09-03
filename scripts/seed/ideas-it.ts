import type { IdeaSeed } from "./types";

/** IT Service Delivery — all services. */
export const IT_IDEAS: IdeaSeed[] = [
  {
    key: "it-sd-01",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Suggest a category and queue for incoming tickets",
    description:
      "Tickets get miscategorized at intake, which skews every report and slows routing. Suggest a category and target queue from the ticket text, let the agent confirm with one click, and track suggestion acceptance.",
    notes: "",
    status: "solved",
  },
  {
    key: "it-sd-02",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Draft known-error articles from resolved tickets",
    description:
      "When the same incident signature resolves the same way repeatedly, draft a known-error article from the resolved tickets so the desk can close the next one faster. Drafts go to the knowledge manager for approval.",
    notes: "",
    status: "open",
  },
  {
    key: "it-sd-03",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Faster tickets",
    description: "Tickets sit untouched in the queue too long. Speed it up.",
    notes: "Escalated by the service desk manager.",
    status: "solved",
    vague: true,
  },
  {
    key: "it-sd-04",
    org: "IT Service Delivery",
    service: "Service Desk",
    title: "Convert meeting minutes into assigned tasks",
    description:
      "The weekly ops meeting produces long minutes and lost follow-ups. Extract each action from the minutes with an owner and due date and push them into the team's task board.",
    notes: "",
    status: "solved",
    cluster: "dup-meeting-actions",
  },
  {
    key: "it-am-01",
    org: "IT Service Delivery",
    service: "Access Management",
    title: "Quarterly access recertification evidence pack",
    description:
      "Assemble per-manager evidence for the quarterly access recertification: what each report holds, when it was last confirmed, and what changed since. Today it's a week of screenshots.",
    notes: "",
    status: "open",
  },
  {
    key: "it-am-02",
    org: "IT Service Delivery",
    service: "Access Management",
    title: "Leaver access revocation checklist",
    description:
      "Run one checklist per leaver across every system — disable, transfer, archive — with each step timestamped and a final confirmation to HR, so nothing lingers after someone leaves.",
    notes: "",
    status: "solved",
  },
  {
    key: "it-am-03",
    org: "IT Service Delivery",
    service: "Access Management",
    title: "Auto-approve standard access requests",
    description:
      "Requests for standard roles — read-only dashboards, baseline software — wait days for manual sign-off. Auto-approve when the request matches the role template and the requester's manager is in the loop, and route everything nonstandard to a human.",
    notes: "",
    status: "solved",
  },
  {
    key: "it-sp-01",
    org: "IT Service Delivery",
    service: "Software Provisioning",
    title: "License reclaim candidates report",
    description:
      "List software licenses idle for 60 or more days — no launches, no sign-ins — with the holder's manager, so they can be reclaimed before renewal instead of buying more seats.",
    notes: "",
    status: "open",
  },
  {
    key: "it-sp-02",
    org: "IT Service Delivery",
    service: "Software Provisioning",
    title: "Route software requests to the right approver",
    description:
      "Software requests bounce between IT, security, and budget holders. Read the request, work out which approvals it actually needs, and send it straight to the first required approver with the justification attached.",
    notes: "",
    status: "solved",
  },
  {
    key: "it-as-01",
    org: "IT Service Delivery",
    service: "Asset Management",
    title: "Laptop refresh cycle forecast",
    description:
      "Forecast the next 24 months of laptop refresh volume and cost from purchase dates and standard warranty lifetimes, so the budget line stops being a surprise.",
    notes: "",
    status: "open",
  },
  {
    key: "it-as-02",
    org: "IT Service Delivery",
    service: "Asset Management",
    title: "Asset disposal certificate tracker",
    description:
      "Track which disposed assets have a certified data-wipe certificate on file and chase the vendor for the ones that don't. Auditors ask for this every year.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "it-x-01",
    org: "IT Service Delivery",
    service: "Self-Service",
    title: "Promote password resets to self-service",
    description:
      "A large share of service desk calls are password resets that the portal already supports. Detect these in the queue and reply with the self-service link, measuring how many callers complete it unaided.",
    notes: "",
    status: "open",
  },
];
