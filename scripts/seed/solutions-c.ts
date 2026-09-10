import type { SolutionSeed } from "./types";

/**
 * Solutions, part 3 — the v4.9 expansion.
 *
 * Written in the same voice as the first two files: whatever the person who
 * built the thing typed into the box when they saved it. Quality varies on
 * purpose. Some describe the mechanism carefully, some describe the relief they
 * felt, one or two are barely a sentence. That variance is the point of the
 * enrichment demo — the vague ones are the records that only become findable
 * after the summary and tags are written back onto them.
 *
 * `sol-gen-notes-a` and `sol-gen-notes-b` are a planted near-duplicate pair:
 * two teams that each built a meeting write-up tool without knowing about the
 * other. That is the single most common form of duplication in a shared
 * services org and the old dataset had no example of it, because every record
 * sat inside one function.
 */
export const SOLUTIONS_C: SolutionSeed[] = [
  // --- General Business Process: documents ---------------------------------
  {
    key: "sol-gen-doc-01",
    name: "Batch Scan Splitter",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Takes the big PDF the scanner spits out and cuts it into one file per document. It looks for the page where a new document starts — different header, a form number, a fresh date block — and splits there. Each file comes out named from what's on its first page, so you can find things afterwards. Anything it isn't sure about goes in a review folder instead of being guessed at.",
    resolvesKey: "gen-doc-01",
  },
  {
    key: "sol-gen-doc-03",
    name: "Template Mail Merge Runner",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Point it at a template and a spreadsheet and it produces one document per row with the fields filled in. Handles the fiddly bits we kept getting wrong by hand: date formats, currency, and leaving the section out entirely when the field is blank rather than printing an empty heading.",
    resolvesKey: "gen-doc-03",
  },
  {
    key: "sol-gen-doc-05",
    name: "Review Pack Assembler",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Merges a folder of attachments into one PDF in the order you specify, bookmarks each section by file name, and puts a contents page on the front with page numbers. Saves about an hour every time we put a pack together.",
    resolvesKey: "gen-doc-05",
    ownerDiffers: true,
  },
  {
    key: "sol-gen-doc-06",
    name: "PDF Table Extractor",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Pulls the tables out of a PDF and gives you a workbook, one sheet per source file. Keeps the column headings and does not merge cells that were separate in the original, which is where the manual retyping used to go wrong. Numbers come out as numbers, not text.",
    resolvesKey: "gen-doc-06",
  },

  // --- General Business Process: meetings -----------------------------------
  {
    key: "sol-gen-notes-a",
    name: "Meeting Write-Up Assistant",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "Paste the transcript and it gives you a short summary, the decisions that were made, and a table of actions with an owner and a due date for each. We run it straight after the call and send the output to the room so people can correct it while they still remember.",
    resolvesKey: "gen-mtg-01",
    cluster: "sol-gen-notes",
  },
  {
    key: "sol-gen-notes-b",
    name: "Minutes and Actions Drafter",
    artifactType: "prompt",
    technologyType: "ChatGPT",
    rawDescription:
      "Give it a meeting transcript and it writes up the meeting — a brief summary, what was decided, and who agreed to do what by when as a list. Nobody has to take minutes any more. We send the draft round the same day so people can fix anything it got wrong.",
    resolvesKey: "exp-hr-08",
    cluster: "sol-gen-notes",
    ownerDiffers: true,
  },
  {
    key: "sol-gen-mtg-03",
    name: "Pre-Meeting Status Chaser",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "The day before the weekly, it emails each owner just their own open items and asks for a line on each. Whatever comes back by the morning gets collected into one status page for the chair. The meeting now starts from what people already wrote instead of going round the table.",
    resolvesKey: "gen-mtg-03",
  },

  // --- General Business Process: reporting ----------------------------------
  {
    key: "sol-gen-rep-01",
    name: "Monthly Pack Builder",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Drop this month's three exports in the folder and it produces the draft pack — same charts, same order, same commentary headings as last month, with the figures updated. The analyst still writes the judgement calls, but they are editing a finished draft instead of rebuilding it.",
    resolvesKey: "gen-rep-01",
  },
  {
    key: "sol-gen-rep-02",
    name: "Variance Commentary Drafter",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "Feed it this period and last period and it tells you what moved most and drafts a sentence for each in our house style. It says what changed and by how much; it does not invent a reason, which was the thing we were worried about.",
    resolvesKey: "gen-rep-02",
  },
  {
    key: "sol-gen-rep-04",
    name: "Export Cleanup Script",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Strips the merged headers, blank rows and mid-table subtotals out of a raw export and standardises the column names and date formats. Everything downstream stopped breaking once every file arrived in the same shape.",
    resolvesKey: "gen-rep-04",
    neverReviewed: true,
  },

  // --- General Business Process: drafting and review ------------------------
  {
    key: "sol-gen-drf-01",
    name: "First Response Drafter",
    artifactType: "skill",
    technologyType: "ChatGPT",
    rawDescription:
      "Reads an incoming request, works out which of our standard shapes it is, and drafts the reply using the approved wording for that shape. Nothing sends automatically — it lands in drafts and a person checks it. Cut our first-response time roughly in half.",
    resolvesKey: "gen-drf-01",
  },
  {
    key: "sol-gen-drf-02",
    name: "Checklist Review Prompt",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "You give it the checklist and the document and it reports each point as covered, missing, or unclear, quoting the passage it relied on. The quoting matters — reviewers can check its reasoning instead of taking its word for it.",
    resolvesKey: "gen-drf-02",
  },
  {
    key: "sol-gen-drf-04",
    name: "Document Version Comparer",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Compares two versions and lists what was added, removed and reworded, with the substantive changes separated from formatting noise. Much easier to read than track changes when the formatting has been reflowed as well.",
    resolvesKey: "gen-drf-04",
  },

  // --- General Business Process: knowledge ----------------------------------
  {
    key: "sol-gen-kno-01",
    name: "Shared Drive Meaning Search",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Indexes the contents of the shared drive so you can search by what a document is about rather than guessing the file name. Ask a question in ordinary words and it returns the files that answer it, with the matching passage shown so you can tell whether it is the right one before opening it.",
    resolvesKey: "gen-kno-01",
    ownerDiffers: true,
  },
  {
    key: "sol-gen-kno-02",
    name: "Procedure Q&A Assistant",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Answers questions using only the approved procedure documents and always names the document and section it came from. If the answer is not in the approved set it says so rather than filling the gap, which is the whole reason we were allowed to put it in front of anyone.",
    resolvesKey: "gen-kno-02",
  },

  // --- Finance Operations ---------------------------------------------------
  {
    key: "sol-exp-fin-01",
    name: "Receipt to Statement Matcher",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Reads the receipt images, pulls out merchant, date and amount, and matches each one to a card statement line. Gives you three lists at the end: matched, statement lines with no receipt, and receipts we could not place. The reviewer only looks at the last two.",
    resolvesKey: "exp-fin-01",
  },
  {
    key: "sol-exp-fin-04",
    name: "Journal Entry Risk Ranker",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Scores each entry on the things that actually correlate with problems — round numbers, posted outside working hours, unusual account combinations, a preparer who has never used that account — and sorts the review queue by score. Reviewers see the same number of entries but in a useful order.",
    resolvesKey: "exp-fin-04",
  },
  {
    key: "sol-exp-fin-07",
    name: "Payroll Run Comparison",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "compares this run against last run and lists everyone whose pay changed with the amount and the reason code if there is one. anything without a reason code goes on a separate tab which is the tab we actually look at",
    resolvesKey: "exp-fin-07",
  },

  // --- HR Shared Services ---------------------------------------------------
  {
    key: "sol-exp-hr-01",
    name: "Exit Interview Theme Summary",
    artifactType: "prompt",
    technologyType: "Claude",
    rawDescription:
      "Takes a quarter of exit interviews and groups what people said into themes with a count and a couple of representative quotes each. The quotes are paraphrased rather than lifted so nobody is identifiable from their own phrasing. Leadership reads the summary instead of nothing, which is what happened before.",
    resolvesKey: "exp-hr-01",
  },
  {
    key: "sol-exp-hr-03",
    name: "Job Description Drafter",
    artifactType: "prompt",
    technologyType: "ChatGPT",
    rawDescription:
      "Give it the role, the level and the nearest existing description and it drafts one in our template with all the required sections present. Hiring managers stopped starting from whatever document they found on the drive.",
    resolvesKey: "exp-hr-03",
  },
  {
    key: "sol-exp-hr-05",
    name: "Training Completion Chaser",
    artifactType: "automation",
    technologyType: "RPA",
    rawDescription:
      "Pulls the completion report, works out who is outstanding, and sends each person only their own list. Managers get one summary for their team. Runs every Monday. Completion went from chasing at quarter end to not really needing to chase.",
    resolvesKey: "exp-hr-05",
    neverReviewed: true,
  },

  // --- Procurement Operations ----------------------------------------------
  {
    key: "sol-exp-pro-01",
    name: "Supplier Questionnaire Triage",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Reads a completed risk questionnaire, extracts the answers we care about, and checks them against our thresholds. Anything inside tolerance is summarised in a line; anything outside is escalated with the relevant answer quoted. The analyst reads a page instead of forty.",
    resolvesKey: "exp-pro-01",
  },
  {
    key: "sol-exp-pro-04",
    name: "Catalog Price Change Alert",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Compares each new supplier price file against the contracted rates and emails the category buyer anything that moved more than the tolerance in the contract. We used to find these at invoice time, which is far too late to argue about.",
    resolvesKey: "exp-pro-04",
  },
  {
    key: "sol-exp-pro-07",
    name: "Spend Category Classifier",
    artifactType: "automation",
    technologyType: "AI + local automation",
    rawDescription:
      "Assigns a spend category from the free-text description and the supplier. Where it is confident it just assigns; where it is not it puts the line in a review list with its two best guesses. Category reporting became worth reading once the review list existed.",
    resolvesKey: "exp-pro-07",
  },

  // --- Facilities Support ---------------------------------------------------
  {
    key: "sol-exp-fac-01",
    name: "Work Order Photo Triage",
    artifactType: "skill",
    technologyType: "Claude",
    rawDescription:
      "Looks at the photo and the description together and proposes the trade and the urgency. The coordinator confirms with one click. It is right most of the time on the obvious ones, which is where all the volume is.",
    resolvesKey: "exp-fac-01",
  },
  {
    key: "sol-exp-fac-04",
    name: "Courier Invoice Reconciliation",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "matches courier invoice lines to the despatch log on tracking number and date and lists anything charged that we have no record of sending. found enough in the first month to pay for the time it took to write",
    resolvesKey: "exp-fac-04",
  },

  // --- IT Service Delivery --------------------------------------------------
  {
    key: "sol-exp-it-01",
    name: "Licence Usage Forecast",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "Pulls last quarter's actual usage per product and forecasts what we need at renewal, splitting never-used from used-once-a-month from daily. The never-used list is the one that saves money.",
    resolvesKey: "exp-it-01",
  },
  {
    key: "sol-exp-it-04",
    name: "Disposal Certificate Generator",
    artifactType: "automation",
    technologyType: "RPA",
    rawDescription:
      "Generates the disposal certificate for each retired device from the asset record and the wipe log, and flags any device where the wipe evidence is missing rather than issuing a certificate anyway. Audit stopped being a fire drill.",
    resolvesKey: "exp-it-04",
  },

  // --- Orphans (no linked idea) ---------------------------------------------
  {
    key: "sol-orphan-gen-1",
    name: "Plain Language Rewriter",
    artifactType: "prompt",
    technologyType: "ChatGPT",
    rawDescription:
      "Rewrites internal notices into plain language at a set reading level without changing the meaning. Built for one team's policy notices and then quietly picked up by three others. Never had an idea record — it was written on a Friday afternoon.",
    orphan: true,
  },
  {
    key: "sol-orphan-gen-2",
    name: "Weekly Task Board",
    artifactType: "automation",
    technologyType: "Local automation",
    rawDescription:
      "small board for tracking the bits of work that are too small for the project tool. columns are not started / doing / done, each item has an owner. no admin needed, no licence. it is a spreadsheet with a nice front end really",
    orphan: true,
    neverReviewed: true,
  },
];
