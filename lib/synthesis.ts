/**
 * Post-processing for LLM-written prose about catalog records (v3 §2.1).
 *
 * The synthesis prompt that used to live here went with /api/search in v4.6.
 * The id-stripping rule did not: /api/check writes a sentence about the closest
 * records too, and that sentence is subject to the same rule.
 *
 * Lives outside the route because a Next.js route module may only export route
 * handlers, and because the rule is worth testing on its own.
 */

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
