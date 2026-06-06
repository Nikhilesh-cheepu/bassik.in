import { NextRequest, NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import { getVenueChatKnowledge } from "@/lib/venue-chat-knowledge";
import {
  actionUserMessage,
  guestIsBookingIntent,
  handleInstantAction,
  isInstantAction,
  maybeSendBookingLinkIfReady,
  tryInstantBookIntentReply,
  tryInstantContactCaptureReply,
  tryInstantEventSelectReply,
  type ChatActionType,
} from "@/lib/venue-chat-actions";
import {
  appendMessage,
  chatCookieName,
  getLeadSnapshot,
  getMessages,
  getMessagesAfter,
  getMessagesSince,
  getOrCreateLead,
  getWeekOffersForBrand,
  shouldSkipAiForLead,
  updateLeadFields,
  type UtmParams,
} from "@/lib/venue-chat-data";
import { loadChatSession } from "@/lib/venue-chat-session";
import { runVenueChatTurn } from "@/lib/venue-chat-ai";
import { tryExtractBookingHints } from "@/lib/venue-chat-booking-policy";

export const runtime = "nodejs";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function parseUtm(req: NextRequest): UtmParams {
  const sp = req.nextUrl.searchParams;
  return {
    utmSource: sp.get("utm_source"),
    utmMedium: sp.get("utm_medium"),
    utmCampaign: sp.get("utm_campaign"),
    utmContent: sp.get("utm_content"),
  };
}

function setSessionCookie(res: NextResponse, brandId: string, token: string) {
  res.cookies.set(chatCookieName(brandId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  if (!BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }

  const cookieToken = req.cookies.get(chatCookieName(brandId))?.value ?? null;
  const utm = parseUtm(req);
  const after = req.nextUrl.searchParams.get("after");
  const since = req.nextUrl.searchParams.get("since");

  try {
    if (after || since) {
      const { lead } = await getOrCreateLead(brandId, cookieToken, utm);
      const [delta, fresh] = await Promise.all([
        after
          ? getMessagesAfter(lead.id, after)
          : getMessagesSince(lead.id, since!),
        getLeadSnapshot(lead.id),
      ]);
      const res = NextResponse.json({
        lead: fresh ?? lead,
        messages: delta,
        delta: true,
      });
      setSessionCookie(res, brandId, lead.sessionToken);
      return res;
    }

    const session = await loadChatSession(brandId, cookieToken, utm);
    const res = NextResponse.json({
      lead: session.lead,
      messages: session.messages,
      venue: session.venue,
      chat: session.chat,
    });
    setSessionCookie(res, brandId, session.sessionToken);
    return res;
  } catch (e) {
    console.error("[venue-chat GET]", e);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 503 });
  }
}

type ChatAction =
  | { type: "select_event"; offerId: string; label?: string; imageUrl?: string }
  | { type: ChatActionType };

function findOfferForAction(
  offers: Awaited<ReturnType<typeof getWeekOffersForBrand>>,
  action: Extract<ChatAction, { type: "select_event" }>
) {
  let offer = offers.find((o) => o.id === action.offerId);
  if (!offer && action.imageUrl) {
    offer = offers.find((o) => o.imageUrl === action.imageUrl);
  }
  if (!offer && action.label) {
    const label = action.label.trim().toLowerCase();
    offer = offers.find((o) => {
      const line = [o.title, o.dateLine].filter(Boolean).join(" · ").toLowerCase();
      return line === label || o.title?.toLowerCase() === label;
    });
  }
  return offer;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  if (!BRANDS.some((b) => b.id === brandId)) {
    return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as ChatAction | undefined;
  let text = typeof body.message === "string" ? body.message.trim() : "";
  const instantAction = action?.type && isInstantAction(action.type) ? action.type : null;

  const cookieToken = req.cookies.get(chatCookieName(brandId))?.value ?? null;
  const utm = parseUtm(req);

  try {
    const { lead } = await getOrCreateLead(brandId, cookieToken, utm);
    const offers = await getWeekOffersForBrand(brandId);
    const knowledge = await getVenueChatKnowledge(brandId);

    if (action?.type === "select_event") {
      const sel = action as Extract<ChatAction, { type: "select_event" }>;
      const offer = findOfferForAction(offers, sel);
      const eventName =
        sel.label?.trim() ||
        (offer ? [offer.title, offer.dateLine].filter(Boolean).join(" · ") : "") ||
        "this event";
      if (offer) {
        await updateLeadFields(lead.id, {
          selectedEventId: offer.id,
          selectedEventName: offer.title ?? eventName,
        });
      }
      text = `I'm interested in ${eventName}`;
    } else if (instantAction) {
      text = actionUserMessage(instantAction);
    }

    if (!text) {
      return NextResponse.json({ error: "Could not send — try typing a message" }, { status: 400 });
    }
    if (text.length > 800) {
      return NextResponse.json({ error: "Message too long (max 800 characters)" }, { status: 400 });
    }

    await appendMessage(lead.id, "USER", text);
    const aiGate = await shouldSkipAiForLead(lead.id);
    const newMessages = [];
    let usedInstant = false;

    if (action?.type === "select_event") {
      const sel = action as Extract<ChatAction, { type: "select_event" }>;
      const offer = findOfferForAction(offers, sel);
      const eventName =
        sel.label?.trim() ||
        (offer ? [offer.title, offer.dateLine].filter(Boolean).join(" · ") : "") ||
        "this event";
      const currentLead = (await getLeadSnapshot(lead.id)) ?? lead;
      const eventReplies = await tryInstantEventSelectReply({
        leadId: lead.id,
        brandId,
        knowledge,
        lead: currentLead,
        eventName,
        offerId: offer?.id ?? sel.offerId,
      });
      newMessages.push(...eventReplies);
      usedInstant = true;
    } else if (instantAction) {
      const currentLead = (await getLeadSnapshot(lead.id)) ?? lead;
      const instantReplies = await handleInstantAction({
        leadId: lead.id,
        brandId,
        action: instantAction,
        knowledge,
        lead: currentLead,
      });
      newMessages.push(...instantReplies);
      usedInstant = true;
    } else {
      let currentLead = (await getLeadSnapshot(lead.id)) ?? lead;

      const contactCapture = await tryInstantContactCaptureReply({
        leadId: lead.id,
        brandId,
        knowledge,
        lead: currentLead,
        userMessage: text,
      });

      if (contactCapture) {
        newMessages.push(...contactCapture.messages);
        currentLead = (await getLeadSnapshot(lead.id)) ?? currentLead;
        usedInstant = true;
      } else if (guestIsBookingIntent(text)) {
        const bookReplies = await tryInstantBookIntentReply({
          leadId: lead.id,
          brandId,
          knowledge,
          lead: currentLead,
          userMessage: text,
        });
        if (bookReplies?.length) {
          newMessages.push(...bookReplies);
          usedInstant = true;
        }
      }

      if (!usedInstant) {
        if (aiGate.skip) {
          if (aiGate.reason === "closed") {
            newMessages.push(
              await appendMessage(
                lead.id,
                "SYSTEM",
                "This chat is closed. Call or WhatsApp us anytime if you need help."
              )
            );
          } else if (aiGate.reason === "handed_off") {
            newMessages.push(
              await appendMessage(
                lead.id,
                "ASSISTANT",
                "Got your message — our team will reply shortly."
              )
            );
          } else if (aiGate.reason === "ai_disabled") {
            newMessages.push(
              await appendMessage(
                lead.id,
                "ASSISTANT",
                `Thanks for reaching out! Use the quick buttons above to book, call, or WhatsApp ${knowledge.venueName} — or share your name and mobile if you'd like a booking link.`
              )
            );
          }
        } else {
          const hints = tryExtractBookingHints(text);
          if (Object.keys(hints).length > 0) {
            await updateLeadFields(lead.id, hints);
            currentLead = (await getLeadSnapshot(lead.id)) ?? currentLead;
          }

          const history = await getMessages(lead.id);
          const ai = await runVenueChatTurn({
            brandId,
            venueShortName: knowledge.venueName,
            lead: currentLead,
            offers,
            history,
            userMessage: text,
          });

          if (Object.keys(ai.leadUpdates).length > 0) {
            await updateLeadFields(lead.id, ai.leadUpdates);
            currentLead = (await getLeadSnapshot(lead.id)) ?? currentLead;
          }

          newMessages.push(await appendMessage(lead.id, "ASSISTANT", ai.reply));

          for (const offerId of ai.posterOfferIds) {
            const offer = offers.find((o) => o.id === offerId);
            if (offer) {
              const line = [offer.title, offer.dateLine].filter(Boolean).join(" · ") || "Event poster";
              newMessages.push(
                await appendMessage(lead.id, "ASSISTANT", line, null, {
                  type: "flyers",
                  items: [
                    {
                      id: offer.id,
                      imageUrl: offer.imageUrl,
                      title: offer.title,
                      dateLine: offer.dateLine,
                    },
                  ],
                  selectable: true,
                })
              );
            }
          }

          const bookingIntent =
            guestIsBookingIntent(text) ||
            currentLead.status === "BOOKING_STARTED" ||
            Boolean(ai.leadUpdates.contactNumber || ai.leadUpdates.guestName);
          const linkMsg = await maybeSendBookingLinkIfReady({
            leadId: lead.id,
            brandId,
            lead: currentLead,
            bookingIntent,
          });
          if (linkMsg) newMessages.push(linkMsg);
        }
      }
    }

    const updatedLead = (await getLeadSnapshot(lead.id)) ?? lead;
    const allMessages = await getMessages(lead.id);

    const res = NextResponse.json({
      lead: updatedLead,
      messages: allMessages,
      newMessages,
      booked: false,
      instant: usedInstant,
    });
    setSessionCookie(res, brandId, lead.sessionToken);
    return res;
  } catch (e) {
    console.error("[venue-chat POST]", e);
    return NextResponse.json({ error: "Could not send message" }, { status: 503 });
  }
}
