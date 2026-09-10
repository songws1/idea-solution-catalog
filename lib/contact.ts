/**
 * Contact affordances for the synthetic employee directory.
 *
 * Addresses come from `data/users.json`, which the seed script generates on the
 * reserved `gbs.example` TLD. Reserved means it cannot resolve, so these links
 * behave exactly like real ones in the UI while guaranteeing nothing in this
 * prototype can reach an actual inbox.
 *
 * The subject line names the record by title, never by id: an id in a subject
 * would be the §2.1 stutter escaping the app through the mail client, and a
 * title is what the recipient would recognise anyway.
 */

export function mailtoFor(email: string, recordTitle: string): string {
  const subject = encodeURIComponent(`Catalog: ${recordTitle}`);
  return `mailto:${email}?subject=${subject}`;
}

/**
 * "Is this still working?" — the one action a stale record actually needs
 * (v4.8).
 *
 * The obvious design is a button that stamps a new review date on the record.
 * This prototype must not write back to any real system, and a button that
 * looks like it saves but does not would be worse than none. So the action is
 * the thing a person would really do: mail the owner and ask. That works
 * today, needs no backend, and is exactly what the Power Apps build would put
 * behind its own confirm button anyway — a request to a human, not a
 * self-certifying checkbox.
 *
 * The body is pre-written because the ask is awkward to phrase. Someone who
 * has to compose "is your two-year-old automation still alive?" from scratch
 * usually just closes the window.
 */
export function confirmStillWorksMailto(email: string, recordName: string): string {
  const subject = encodeURIComponent(`Still working? ${recordName}`);
  const body = encodeURIComponent(
    [
      `Hello,`,
      ``,
      `I found "${recordName}" in the solution catalog and I am considering using it rather than building something similar.`,
      ``,
      `The catalog says nobody has confirmed it recently. Could you let me know whether it still runs, and whether there is anything I should know before relying on it?`,
      ``,
      `Thanks.`,
    ].join("\n")
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
