/**
 * Fixed 20-tag taxonomy for category_tags (Addendum A §1.3). Single source of
 * truth: scripts/enrich.ts filters LLM output against this list at enrichment
 * time, and the landing-page Taxonomy filter (§1.1) reads the same list for
 * its options. No other tag values may be generated or displayed.
 */
export const TAG_TAXONOMY = [
  // Domain tags
  "invoice-processing",
  "collections",
  "financial-close",
  "dispute-handling",
  "onboarding",
  "benefits-administration",
  "recruiting",
  "vendor-management",
  "spend-analysis",
  "contract-management",
  "space-management",
  "maintenance",
  "inventory-restock",
  "it-service-desk",
  "access-management",
  // Cross-cutting capability tags
  "email-triage",
  "document-extraction",
  "meeting-notes",
  "task-tracking",
  "approvals",
] as const;

export type TagTaxonomyValue = (typeof TAG_TAXONOMY)[number];