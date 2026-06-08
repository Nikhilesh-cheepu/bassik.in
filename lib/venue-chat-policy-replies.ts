import { appendMessage, updateLeadFields, type ChatLeadSnapshot, type ChatMessageDto } from "@/lib/venue-chat-data";
import { looksLikeChatQuestion, sanitizeGuestName } from "@/lib/venue-chat-guest";
import { isClubRogueBrand } from "@/lib/club-rogue";

export { looksLikeChatQuestion as guestIsVenueQuestion } from "@/lib/venue-chat-guest";

export function guestAsksMenWelcome(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /\b(can|are|do)\s+(men|guys|boys|male|males|husbands?|boyfriends?)\s+(come|join|enter|allowed|welcome|get in)\b/.test(
      t
    ) ||
    /\b(men|guys|boys|males)\s+(allowed|welcome|ok|okay|permitted)\b/.test(t) ||
    /\bwhat about (the )?(men|guys|boys|male|males)\b/.test(t) ||
    /\bcan i (bring|come with) (my )?(boyfriend|husband|guys|male friends?|friends)\b/.test(t) ||
    /\bis it (only|just) for (ladies|women|girls)\b/.test(t) ||
    /\b(ladies night|ladies)\b.*\b(men|guys|boys)\b/.test(t) ||
    /\b(men|guys|boys)\b.*\b(ladies night|ladies)\b/.test(t)
  );
}

function menWelcomePolicyCopy(brandId: string): string {
  if (isClubRogueBrand(brandId)) {
    return (
      "Absolutely — men are always welcome! 💫\n\n" +
      "Ladies Night means complimentary drinks for ladies as per that night's offer. " +
      "You get the full club — same music, crowd, and energy — with ₹2k redeemable cover on your food & drinks at the venue.\n\n" +
      "Bring your group — mixed tables make the best nights 😊"
    );
  }
  return (
    "Absolutely — men are always welcome! 💫\n\n" +
    "Ladies Night is a special offer for ladies on drinks (per the event poster) — not a girls-only night. " +
    "Everyone's in for the same vibe, music, and night out.\n\n" +
    "Tell me when you're planning to come and I'll help you book 😊"
  );
}

/** Clear a bogus guestName stored from a misread question or AI slip. */
export async function scrubInvalidGuestName(
  leadId: string,
  lead: ChatLeadSnapshot
): Promise<ChatLeadSnapshot> {
  if (!lead.guestName) return lead;
  if (sanitizeGuestName(lead.guestName)) return lead;
  return updateLeadFields(leadId, { guestName: null });
}

/** Answer common policy questions instantly — don't treat them as names or booking steps. */
export async function tryInstantVenueQuestionReply(params: {
  leadId: string;
  brandId: string;
  userMessage: string;
}): Promise<ChatMessageDto[] | null> {
  const { leadId, brandId, userMessage } = params;
  if (!looksLikeChatQuestion(userMessage)) return null;

  if (guestAsksMenWelcome(userMessage)) {
    return [await appendMessage(leadId, "ASSISTANT", menWelcomePolicyCopy(brandId))];
  }

  return null;
}

export function shouldSkipBookingLinkForMessage(userMessage: string): boolean {
  return looksLikeChatQuestion(userMessage);
}
