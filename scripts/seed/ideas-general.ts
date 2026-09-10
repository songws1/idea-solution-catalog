import type { IdeaSeed } from "./types";

/**
 * General Business Process — the cross-functional service (v4.9).
 *
 * Added after light UAT, where testers typed plausible things and got nothing
 * back. The cause was not weak retrieval: the catalog held only function-
 * specific process automation, so "a PDF editor", "something to track a small
 * project", "a prompt that helps me review a case" all landed outside it. A
 * tester cannot tell "the catalog does not have this" from "the search is
 * broken", so an accurate empty answer read as a defect and the interface never
 * got evaluated.
 *
 * These records are the layer that was missing. They are deliberately the
 * generic capabilities anyone in a shared-services org reaches for, described
 * the way someone would ask for them rather than in the vocabulary of one
 * function: handling documents, running meetings, producing a recurring report,
 * drafting and reviewing text, finding what the team already knows.
 *
 * They are also the honest shape of a real catalog. A GBS org's most-duplicated
 * builds are exactly these — five teams each write their own meeting-notes
 * prompt — which is the duplication this product exists to catch.
 */
export const GENERAL_IDEAS: IdeaSeed[] = [
  // --- Document Handling ----------------------------------------------------
  {
    key: "gen-doc-01",
    org: "General Business Process",
    service: "Document Handling",
    title: "Split a scanned batch into one file per document",
    description:
      "The scanner produces one long PDF for a whole tray of paperwork. Someone then sits and splits it by hand into separate files and names each one. Detect where one document ends and the next begins, split on those boundaries, and name each file from what is printed on its first page.",
    notes: "Comes up every month in three different teams.",
    status: "solved",
  },
  {
    key: "gen-doc-02",
    org: "General Business Process",
    service: "Document Handling",
    title: "Make old scanned files searchable",
    description:
      "A large share of the archive is scanned images with no text layer, so nothing in it can be found by searching. Run OCR over the backlog and save a searchable copy alongside the original, leaving the original untouched.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-doc-03",
    org: "General Business Process",
    service: "Document Handling",
    title: "Fill a standard template from a spreadsheet row",
    description:
      "We produce the same document dozens of times with a handful of fields changed — a name, a date, an amount, a reference. Take a template and a spreadsheet and produce one finished document per row, ready to check and send.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-doc-04",
    org: "General Business Process",
    service: "Document Handling",
    title: "Black out personal and account details before sharing",
    description:
      "Before a file goes to anyone outside the team, someone has to remove names, addresses and account numbers. It is done by hand and it is easy to miss one. Find the sensitive fields, redact them properly rather than drawing a box over them, and produce a list of what was removed so it can be checked.",
    notes: "Needs a human to confirm before anything leaves.",
    status: "open",
  },
  {
    key: "gen-doc-05",
    org: "General Business Process",
    service: "Document Handling",
    title: "Combine attachments into one bookmarked pack",
    description:
      "Assembling a review pack means opening a dozen attachments, putting them in the right order and adding a contents page. Merge them in a defined order, bookmark each section, and add a front sheet listing what is inside.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-doc-06",
    org: "General Business Process",
    service: "Document Handling",
    title: "Pull tables out of PDFs into a spreadsheet",
    description:
      "Figures arrive as tables inside PDFs and get retyped into a spreadsheet, which is slow and introduces errors. Extract the tables, keep the column structure, and write them out as a workbook with one sheet per source document.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-doc-07",
    org: "General Business Process",
    service: "Document Handling",
    title: "Name and file documents by what is inside them",
    description:
      "Files land in a shared folder called things like scan0043.pdf. Read each one, work out what it is and who it belongs to, then rename it to the team's convention and move it to the right subfolder.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "gen-doc-08",
    org: "General Business Process",
    service: "Document Handling",
    title: "Edit and reorder pages in a PDF without buying a tool",
    description:
      "People need to rotate a page, drop a blank one, or move a page to the front, and they do not have an editor licensed. Something simple that takes a file, applies those page-level edits and hands the file back.",
    notes: "Asked for by several people who each thought they were the only one.",
    status: "open",
  },

  // --- Meetings & Coordination ---------------------------------------------
  {
    key: "gen-mtg-01",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Turn a recorded meeting into notes and owners",
    description:
      "Meetings are recorded but nobody writes them up, so decisions are lost and actions are remembered differently by different people. Produce a short summary, the decisions taken, and a list of who owes what by when.",
    notes: "",
    status: "solved",
    // Planted near-duplicate with exp-hr-08 — see the note there.
    cluster: "gen-notes",
  },
  {
    key: "gen-mtg-02",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Build the agenda from last time's open items",
    description:
      "Every weekly meeting starts by working out what is still outstanding. Carry forward the items that were not closed, group them by owner, and produce a draft agenda the chair can edit before sending.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-mtg-03",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Chase people for status before the weekly call",
    description:
      "Half the meeting is spent asking people where things stand. Send each owner their own outstanding items the day before and collect what comes back into one status view for the chair.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-mtg-04",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Find a slot that works across three regions",
    description:
      "Scheduling anything across regions takes several rounds of email. Look at the calendars involved, respect a working-hours window in each region, and propose two or three times that work for everyone.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-mtg-05",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Catch someone up on a long email thread",
    description:
      "When a thread gets forwarded to a new person they have to read forty messages to understand it. Produce a short brief: what is being decided, what has been agreed, what is still open, and who is waiting on whom.",
    notes: "",
    status: "in_progress",
  },
  {
    key: "gen-mtg-06",
    org: "General Business Process",
    service: "Meetings & Coordination",
    title: "Track small pieces of work without a full project tool",
    description:
      "Most of what the team runs is too small for the project management platform but too big to keep in someone's head. Somewhere lightweight to list the pieces, who has each one, and what state it is in, that does not need a licence or an administrator.",
    notes: "Several teams keep private spreadsheets for exactly this.",
    status: "open",
  },

  // --- Reporting & Analysis -------------------------------------------------
  {
    key: "gen-rep-01",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "Build the monthly deck from the same three exports",
    description:
      "The same pack is produced every month from the same source files, with the same charts and the same commentary structure. Take this month's exports and produce the draft pack so the analyst edits rather than rebuilds.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-rep-02",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "Explain what moved since last month",
    description:
      "The numbers get published without any explanation of why they changed, so the first question in every review is the same. Compare this period against the last, find the largest movements, and draft a plain sentence for each.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-rep-03",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "Flag odd-looking rows before a file goes out",
    description:
      "Errors are usually found by the recipient rather than by us. Before a file is sent, check it for values well outside the usual range, duplicated rows, missing fields and dates that cannot be right, and list what to look at.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-rep-04",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "Clean a raw export into a usable table",
    description:
      "Exports arrive with merged headers, blank rows, totals in the middle of the data and inconsistent date formats. Standardise them into one clean table with consistent column names, so the same downstream steps work every time.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-rep-05",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "A list of which reports exist and who owns them",
    description:
      "Nobody can say how many recurring reports the team produces, who owns each one, or whether anyone still reads it. Somewhere to record them with an owner and a purpose, so the unread ones can be stopped.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-rep-06",
    org: "General Business Process",
    service: "Reporting & Analysis",
    title: "Reconcile two files that should agree",
    description:
      "Two extracts of the same thing come from different systems and someone compares them line by line in a spreadsheet. Match the rows on a key, list what appears in one and not the other, and show the differences where both exist.",
    notes: "",
    status: "in_progress",
  },

  // --- Drafting & Review ----------------------------------------------------
  {
    key: "gen-drf-01",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "Draft the first reply to a common request",
    description:
      "Most incoming requests fall into a handful of shapes and get the same answer written from scratch each time. Recognise the shape, draft a reply using our standard wording, and leave it for a person to check and send.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-drf-02",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "Check a document against a review checklist",
    description:
      "Reviews are done against a checklist held in someone's head, so different reviewers catch different things. Take the checklist and the document, and report which points are covered, which are missing and which are unclear.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-drf-03",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "Rewrite internal text into plain language",
    description:
      "Notices and procedure text are written differently by everyone and are often hard to follow. Rewrite a passage in plain, consistent language at a set reading level without changing what it means.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-drf-04",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "List what changed between two versions of a document",
    description:
      "Comparing versions by eye misses things, especially when the formatting has also changed. Produce a plain list of what was added, removed and reworded, with the substantive changes separated from the cosmetic ones.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-drf-05",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "Check a case file against policy before it is signed off",
    description:
      "Before a case is closed, someone confirms the file contains what policy requires — the right forms, the right approvals, notes at each step. Read the file against the policy and flag what is missing or out of order, without making any judgement about the outcome.",
    notes: "A person decides; this only says what is absent.",
    status: "open",
  },
  {
    key: "gen-drf-06",
    org: "General Business Process",
    service: "Drafting & Review",
    title: "Standard replies for a recurring escalation",
    description:
      "The same escalation arrives every few weeks and each person answers it differently, which makes us look inconsistent. A small set of agreed replies covering the usual variants, kept somewhere the whole team uses.",
    notes: "",
    status: "in_progress",
  },

  // --- Knowledge & Search ---------------------------------------------------
  {
    key: "gen-kno-01",
    org: "General Business Process",
    service: "Knowledge & Search",
    title: "Search the shared drive by meaning, not filename",
    description:
      "Finding anything on the shared drive depends on guessing what the file was called. Search across the contents by what they are about, so a question in ordinary words returns the right document.",
    notes: "",
    status: "solved",
  },
  {
    key: "gen-kno-02",
    org: "General Business Process",
    service: "Knowledge & Search",
    title: "Answer common questions from our own procedure documents",
    description:
      "The same questions are asked repeatedly and the answers are already written down, just not where people look. Answer from the approved procedure documents and always cite which document and section the answer came from.",
    notes: "Must not answer from anything outside the approved set.",
    status: "solved",
  },
  {
    key: "gen-kno-03",
    org: "General Business Process",
    service: "Knowledge & Search",
    title: "Know who to ask about what",
    description:
      "New joiners spend weeks working out who owns which process. Keep a list of areas and the people who know them, so a question reaches the right person first time.",
    notes: "",
    status: "open",
  },
  {
    key: "gen-kno-04",
    org: "General Business Process",
    service: "Knowledge & Search",
    title: "See what our team has already built",
    description:
      "People build the same small tool twice because there is nowhere to look first. One place listing what exists, who built it and how to get it.",
    notes: "This is the catalog itself — recorded because it was asked for.",
    status: "open",
  },
];
