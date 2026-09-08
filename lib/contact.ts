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
