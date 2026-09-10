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
  /**
   * Added with the General Business Process service (v4.9). The original
   * twenty were fifteen domain tags and five cross-cutting ones, which was the
   * right shape for a catalog of function-specific process automation and the
   * wrong one once the catalog held generic tooling: a PDF splitter or a
   * plain-language rewriter had no honest tag and would have been forced into
   * a domain it has nothing to do with, which would have made retrieval worse
   * rather than better.
   *
   * These are subject-matter tags, deliberately. The SHAPE of a solution
   * (extract, triage, summarise, draft, check) is a different axis and belongs
   * in its own attribute if it is ever added — encoding it here would mean
   * maintaining the same idea in two places.
   */
  "document-conversion",
  "drafting",
  "quality-review",
  "reporting",
  "scheduling",
  "knowledge-search",
] as const;

export type TagTaxonomyValue = (typeof TAG_TAXONOMY)[number];