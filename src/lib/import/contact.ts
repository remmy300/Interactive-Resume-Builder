import type { LinkRef } from "../import-links";
import type { PersonalDetails } from "../resume-schema";
import { URL_PATTERN } from "./patterns";
import type { Collector } from "./report";
import { findEmail, findPhone, validUrl } from "./validate";

interface ContactInput {
  personal: PersonalDetails;
  /** The header lines plus any Contact block, joined. */
  contactArea: string;
  /** The whole CV, used when the header has no e-mail or number. */
  text: string;
  headerEnd: number;
  urlsByLine: Map<number, string[]>;
  linkRefs: LinkRef[];
}

/** Reads e-mail, phone number and profile links into `personal`. */
export function readContact(input: ContactInput, collector: Collector): void {
  const { personal, contactArea, text, headerEnd, urlsByLine, linkRefs } = input;

  // Contact details can appear anywhere in the header blurbs or a Contact block.
  const email = findEmail(contactArea) || findEmail(text);
  personal.email = email;
  if (email) collector.rate("personal.email", "high", "A well-formed address was found.");

  const anyPhone = findPhone(text);
  const phone = findPhone(contactArea) ?? (anyPhone?.strong ? anyPhone : null);
  if (phone) {
    personal.phone = phone.value;
    collector.rate(
      "personal.phone",
      phone.strong ? "high" : "medium",
      phone.strong
        ? "Has a country code and a plausible length."
        : "No country code, so it may be another number.",
    );
  }

  // Personal profile links come from the header only. Anywhere else a GitHub
  // address belongs to a project, not to the person.
  const headerUrls = [
    ...[...urlsByLine.entries()]
      .filter(([index]) => index < headerEnd)
      .flatMap(([, urls]) => urls),
    ...(contactArea.match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
  ];
  for (const link of headerUrls) {
    const value = validUrl(link);
    if (!value) continue;
    if (/linkedin\.com/i.test(value)) personal.linkedIn ||= value;
    else if (/github\.com/i.test(value)) personal.github ||= value;
    else personal.portfolio ||= value;
  }

  // A link with no visible words cannot be placed on a line. A bare profile
  // address (github.com/name) is still the person's own; a repository is not.
  for (const ref of linkRefs.filter((item) => !item.label.trim())) {
    if (/github\.com\/[^/]+\/?$/i.test(ref.url)) personal.github ||= ref.url;
  }
  if (!personal.linkedIn) {
    const everywhere = [
      ...linkRefs.map((ref) => ref.url),
      ...(text.match(new RegExp(URL_PATTERN.source, "gi")) ?? []),
    ];
    const linkedIn = everywhere
      .map(validUrl)
      .find((url) => url && /linkedin\.com/i.test(url));
    if (linkedIn) personal.linkedIn = linkedIn;
  }
}
