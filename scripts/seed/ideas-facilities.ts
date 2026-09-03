import type { IdeaSeed } from "./types";

/** Facilities Support — all services. */
export const FACILITIES_IDEAS: IdeaSeed[] = [
  {
    key: "fa-sp-01",
    org: "Facilities Support",
    service: "Space Planning",
    title: "Aggregate desk utilization surveys",
    description:
      "The quarterly desk utilization walk produces paper counts that get typed up inconsistently. Standardize the collection form and aggregate results by floor and neighborhood, with week-over-week deltas.",
    notes: "",
    status: "open",
  },
  {
    key: "fa-sp-02",
    org: "Facilities Support",
    service: "Space Planning",
    title: "Fix room bookings",
    description: "Booked rooms sit empty all day while people hunt for space. Sort it out.",
    notes: "Complaints come up in every site meeting.",
    status: "solved",
    vague: true,
  },
  {
    key: "fa-mt-01",
    org: "Facilities Support",
    service: "Maintenance Requests",
    title: "Prioritize the preventive maintenance backlog",
    description:
      "Rank open preventive maintenance tasks by asset criticality, warranty status, and how long each has been waiting, so technicians work the backlog in a defensible order instead of first-come-first-served.",
    notes: "",
    status: "solved",
  },
  {
    key: "fa-mt-02",
    org: "Facilities Support",
    service: "Maintenance Requests",
    title: "Recurring issue detector for maintenance tickets",
    description:
      "When the same location logs its third ticket in 60 days, something systemic is failing. Detect the pattern, bundle the history, and open a root-cause item for the facilities engineer.",
    notes: "",
    status: "open",
  },
  {
    key: "fa-ml-01",
    org: "Facilities Support",
    service: "Mail & Logistics",
    title: "Daily package arrival digest",
    description:
      "One digest email at 10am and 2pm listing arrived packages per floor and addressee, instead of individual notifications for every parcel.",
    notes: "",
    status: "open",
  },
  {
    key: "fa-ml-02",
    org: "Facilities Support",
    service: "Mail & Logistics",
    title: "Consolidate courier pickups",
    description:
      "Couriers come four times a day for handfuls of parcels. Batch pickups into two scheduled windows and show expected volume so the dock isn't constantly interrupted.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "fa-rs-01",
    org: "Facilities Support",
    service: "Reception Services",
    title: "Visitor pre-registration summary for hosts",
    description:
      "Each morning, send hosts a summary of their visitors for the day — name, company, arrival time — with a reminder to be at reception. Hosts routinely miss arrivals today.",
    notes: "",
    status: "open",
  },
  {
    key: "fa-x-01",
    org: "Facilities Support",
    service: "Parking & Commute",
    title: "Parking allocation waitlist",
    description:
      "Keep a self-service waitlist for garage bays: when a bay is surrendered, offer it to the next person on the list automatically and record the allocation.",
    notes: "",
    status: "open",
  },
];
