/**
 * Prompt and post-processing for the synthesised answer (v3 §3.5).
 *
 * Lives outside the route because a Next.js route module may only export route
 * handlers, and because the id-stripping rule is worth testing on its own.
 *
 * Nothing here touches retrieval. By the time these run, `retrieve` has already
 * ranked the results; this only shapes the sentence rendered above the board.
 */

export const SYNTHESIS_SYSTEM_PROMPT = [
  "You answer questions about an internal catalog of improvement ideas and built solutions.",
  "Use only the provided catalog records.",
  "Be brief (3 sentences or fewer), plain, and concrete.",
  "Refer to a record by its title or name alone, exactly as written, in double quotes.",
  'Never prefix a title with its type: write "Dispute Email Sorter", not \'the solution "Dispute Email Sorter"\'.',
  "Never write a record identifier of any kind.",
  "Name every built solution that actually answers the question.",
  "If the records contain nothing relevant, say that nothing in the catalog matches.",
].join(" ");

/**
 * Last line of defence for §2.1. The prompt and the context both withhold ids,
 * but a model can still produce the pattern, and one leaked id on the page is
 * the exact stutter this step exists to remove.
 *
 * Deliberately narrow: it only removes the literal `idea-0000` / `sol-0000`
 * shapes and the punctuation left stranded around them.
 */
export function stripRecordIds(text: string): string {
  return (
    text
      .replace(/\s*\((?:idea|sol)-\d+\)/gi, "")
      .replace(/\s*\b(?:idea|sol)-\d+\b/gi, "")
      // Tidy the punctuation the removal strands. A leaked id should never
      // reach here, but if one does the sentence should still read as a
      // sentence rather than as visibly damaged output.
      .replace(/\(\s*\)/g, "")
      .replace(/,(\s*,)+/g, ",")
      .replace(/,\s*(and|or)\b/gi, " $1")
      .replace(/\b(and|or)\s*([.,;:])/gi, "$2")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([.,;:])/g, "$1")
      .trim()
  );
}
