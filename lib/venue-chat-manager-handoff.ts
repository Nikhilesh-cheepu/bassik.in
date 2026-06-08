import { formatPhoneAsk } from "@/lib/venue-chat-copy";
import {
  appendMessage,
  type ChatLeadSnapshot,
  type ChatMessageDto,
  updateLeadFields,
} from "@/lib/venue-chat-data";

export function managerHandoffButtonMetadata(label = "Talk to our team") {
  return { type: "manager_handoff" as const, label };
}

export async function handleRequestManager(params: {
  leadId: string;
  venueName: string;
  lead: ChatLeadSnapshot;
}): Promise<ChatMessageDto[]> {
  const { leadId, venueName, lead } = params;
  await updateLeadFields(leadId, { status: "HANDED_OFF" });

  const phone = lead.contactNumber?.replace(/\D/g, "").slice(-10);
  if (phone?.length === 10) {
    return [
      await appendMessage(
        leadId,
        "ASSISTANT",
        `Got it — I've notified our team at ${venueName}. Please wait here; a manager will reply shortly. You can keep typing if you have more details.`
      ),
    ];
  }

  return [
    await appendMessage(
      leadId,
      "ASSISTANT",
      formatPhoneAsk(
        `Got it — I'll connect you with our manager at ${venueName}. Share your mobile number so they can follow up on WhatsApp if needed.`,
        "Our team will reply in this chat shortly — please wait."
      )
    ),
  ];
}
