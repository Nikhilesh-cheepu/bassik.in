"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRANDS, brandsForLeadsManager } from "@/lib/brands";
import ChatMessageBubble from "@/components/ChatMessageBubble";
import ChatTypingIndicator from "@/components/ChatTypingIndicator";
import ManagerQuickSendBar from "@/components/ManagerQuickSendBar";
import { getChatNeonTheme } from "@/lib/venue-chat-theme";
import type { ManagerShortcutId } from "@/lib/leads-manager-shortcuts";
import {
  buildManagerShortcut,
  shortcutDraftLabel,
} from "@/lib/leads-manager-shortcuts-build";
import {
  filterManagerThreadView,
  formatListTime,
  lastConfirmedMessageId,
  type ChatMessageLike,
} from "@/lib/venue-chat-ui-helpers";

type LeadRow = {
  id: string;
  brandId: string;
  displayLabel: string;
  guestName: string | null;
  contactNumber: string | null;
  partySize: number | null;
  selectedEventName: string | null;
  bookingDate: string | null;
  bookingTime: string | null;
  reservationId: string | null;
  managerNotes: string | null;
  status: string;
  lastMessageAt: string;
  preview: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};

type ChatMessage = ChatMessageLike;

type LeadDetail = LeadRow & {
  selectedEventId?: string | null;
  selectedDiscounts?: unknown;
};

type OutletSettings = {
  hostName: string;
  aiEnabled: boolean;
  playbook: string;
  learnedCount: number;
};

const STATUS_OPTIONS = [
  "NEW",
  "IN_PROGRESS",
  "BOOKING_STARTED",
  "BOOKED",
  "HANDED_OFF",
  "CLOSED",
] as const;

const neon = getChatNeonTheme();

function leadSubtitle(l: Pick<LeadRow, "guestName" | "displayLabel">): string {
  if (l.guestName?.trim() && l.guestName.trim() !== l.displayLabel) {
    return l.guestName.trim();
  }
  return "";
}

function leadInitial(l: Pick<LeadRow, "guestName" | "displayLabel">): string {
  return (l.displayLabel || l.guestName || "?").charAt(0).toUpperCase();
}

function BookingPanel({ lead }: { lead: LeadDetail | null }) {
  if (!lead) return null;
  const hasBooking =
    lead.guestName ||
    lead.contactNumber ||
    lead.partySize ||
    lead.bookingDate ||
    lead.selectedEventName;

  if (!hasBooking && !lead.reservationId) {
    return (
      <p className="border-b border-white/[0.06] px-4 py-3 text-[11px] text-white/40">
        No booking details captured yet
      </p>
    );
  }

  return (
    <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/70">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">
        Booking intel
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {lead.guestName ? <span>Name: {lead.guestName}</span> : null}
        {lead.contactNumber ? <span>Phone: {lead.contactNumber}</span> : null}
        {lead.partySize ? <span>Party: {lead.partySize}</span> : null}
        {lead.selectedEventName ? (
          <span className="col-span-2">Event: {lead.selectedEventName}</span>
        ) : null}
        {lead.bookingDate ? <span>Date: {lead.bookingDate}</span> : null}
        {lead.bookingTime ? <span>Time: {lead.bookingTime}</span> : null}
        {lead.reservationId ? (
          <span className="col-span-2 font-mono text-emerald-300">
            Ref #{lead.reservationId.slice(-6).toUpperCase()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function OutletSettingsCard({
  brandId,
  onReset,
}: {
  brandId: string;
  onReset: () => void;
}) {
  const brand = BRANDS.find((b) => b.id === brandId);
  const [settings, setSettings] = useState<OutletSettings>({
    hostName: "",
    aiEnabled: true,
    playbook: "",
    learnedCount: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pruning, setPruning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads-manager/settings?brandId=${encodeURIComponent(brandId)}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    setSettings({
      hostName: typeof data.hostName === "string" ? data.hostName : "",
      aiEnabled: data.aiEnabled !== false,
      playbook: typeof data.playbook === "string" ? data.playbook : "",
      learnedCount: typeof data.learnedCount === "number" ? data.learnedCount : 0,
    });
  }, [brandId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/leads-manager/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          hostName: settings.hostName.trim() || null,
          aiEnabled: settings.aiEnabled,
          playbook: settings.playbook.trim() || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const resetChats = async () => {
    if (!window.confirm(`Delete ALL chat leads for ${brand?.shortName ?? brandId}? This cannot be undone.`)) {
      return;
    }
    if (window.prompt('Type RESET to confirm') !== "RESET") return;
    setResetting(true);
    try {
      const res = await fetch("/api/leads-manager/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, confirm: "RESET" }),
      });
      if (res.ok) onReset();
    } finally {
      setResetting(false);
    }
  };

  const pruneTestChats = async () => {
    if (
      !window.confirm(
        `Remove test chats for ${brand?.shortName ?? brandId}? Keeps leads where the guest actually messaged, booked, or left phone + name. Smart-renames the rest.`
      )
    ) {
      return;
    }
    if (window.prompt('Type PRUNE to confirm') !== "PRUNE") return;
    setPruning(true);
    try {
      const res = await fetch("/api/leads-manager/prune", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, confirm: "PRUNE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        window.alert(
          `Done — removed ${data.deletedLeads ?? 0} test chat(s), kept ${data.keptLeads ?? 0}, renamed ${data.relabeledLeads ?? 0}.`
        );
        onReset();
      }
    } finally {
      setPruning(false);
    }
  };

  return (
    <div
      className="mx-3 mb-3 overflow-hidden rounded-2xl border border-white/[0.08] p-4"
      style={{ background: "rgba(255,255,255,0.03)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Outlet</p>
          <p
            className="text-base font-bold tracking-tight"
            style={{ background: neon.titleGradient, WebkitBackgroundClip: "text", color: "transparent" }}
          >
            {brand?.shortName ?? brandId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettings((s) => ({ ...s, aiEnabled: !s.aiEnabled }))}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            settings.aiEnabled ? "bg-emerald-500/30" : "bg-white/10"
          }`}
          aria-pressed={settings.aiEnabled}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              settings.aiEnabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
      <p className="mb-3 text-[11px] text-white/50">
        AI {settings.aiEnabled ? "on" : "off"} — when off, only quick actions & booking rules run; you reply manually.
        {settings.learnedCount > 0 ? ` · ${settings.learnedCount} learned replies` : ""}
      </p>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/40">
        Host name (optional)
      </label>
      <input
        value={settings.hostName}
        onChange={(e) => {
          setSettings((s) => ({ ...s, hostName: e.target.value }));
          setSaved(false);
        }}
        placeholder="Empty → friendly neighbourhood host"
        maxLength={48}
        className="mb-3 w-full rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-cyan-500/40"
      />
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/40">
        AI playbook
      </label>
      <textarea
        value={settings.playbook}
        onChange={(e) => {
          setSettings((s) => ({ ...s, playbook: e.target.value }));
          setSaved(false);
        }}
        placeholder="e.g. Always ask name + mobile for bookings. Mention rooftop on Fridays."
        rows={3}
        className="mb-3 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-cyan-500/40"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full px-4 py-1.5 text-[11px] font-bold text-black disabled:opacity-40"
          style={{ background: neon.sendGradient }}
        >
          {saving ? "Saving…" : "Save outlet settings"}
        </button>
        {saved ? <span className="text-[10px] text-emerald-400">Saved</span> : null}
        <button
          type="button"
          onClick={pruneTestChats}
          disabled={pruning}
          className="rounded-full border border-amber-500/30 px-3 py-1.5 text-[10px] font-semibold text-amber-200 disabled:opacity-40"
        >
          {pruning ? "Cleaning…" : "Clean test chats"}
        </button>
        <button
          type="button"
          onClick={resetChats}
          disabled={resetting}
          className="ml-auto rounded-full border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold text-red-300 disabled:opacity-40"
        >
          {resetting ? "Clearing…" : "Clear all chats"}
        </button>
      </div>
    </div>
  );
}

export default function LeadsManagerClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [reply, setReply] = useState("");
  const [pendingMeta, setPendingMeta] = useState<Record<string, unknown> | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const sendInFlightRef = useRef(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const threadCache = useRef<Map<string, { lead: LeadDetail; messages: ChatMessage[] }>>(new Map());
  const threadLastMsgIdRef = useRef<string>("");
  const pollInFlightRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const inboxBrands = useMemo(() => brandsForLeadsManager(), []);

  const chatMessages = useMemo(() => filterManagerThreadView(thread), [thread]);
  const hiddenWelcomeCount = useMemo(
    () => Math.max(0, thread.length - chatMessages.length),
    [thread.length, chatMessages.length]
  );
  const hasGuestUserMessage = useMemo(
    () => thread.some((m) => m.role === "USER"),
    [thread]
  );

  const mergeThreadMessages = (prev: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map(prev.map((m) => [m.id, m]));
    for (const m of incoming) map.set(m.id, m);
    return [...map.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  const syncThreadCursor = (messages: ChatMessage[]) => {
    const id = lastConfirmedMessageId(messages);
    if (id) threadLastMsgIdRef.current = id;
  };

  const loadLeads = useCallback(async (brandId?: string) => {
    const q = brandId ? `?brandId=${encodeURIComponent(brandId)}` : "";
    const res = await fetch(`/api/leads-manager/leads${q}`, { credentials: "include" });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }, []);

  useEffect(() => {
    loadLeads(brandFilter || undefined).catch(() => setAuthed(false));
  }, [brandFilter, loadLeads]);

  useEffect(() => {
    if (selectedId && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread, selectedId]);

  useEffect(() => {
    if (!selectedId || document.hidden) return;
    const poll = () => {
      if (pollInFlightRef.current) return;
      const after = threadLastMsgIdRef.current;
      if (!after) return;
      pollInFlightRef.current = true;
      fetch(`/api/leads-manager/leads/${selectedId}?after=${encodeURIComponent(after)}`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.messages) return;
          const lead = data.lead as LeadDetail;
          const incoming = data.messages as ChatMessage[];
          if (data.delta && incoming.length === 0) {
            setLeadDetail(lead);
            return;
          }
          setThread((prev) => {
            const next = data.delta ? mergeThreadMessages(prev, incoming) : incoming;
            syncThreadCursor(next);
            threadCache.current.set(selectedId, { lead, messages: next });
            return next;
          });
          setLeadDetail(lead);
        })
        .catch(() => {})
        .finally(() => {
          pollInFlightRef.current = false;
        });
    };
    void poll();
    const id = window.setInterval(poll, 2000);
    const onVis = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [selectedId]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/leads-manager/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password");
      return;
    }
    setAuthed(true);
    await loadLeads(brandFilter || undefined);
  };

  const openLead = async (id: string, opts?: { force?: boolean }) => {
    setSelectedId(id);
    const cached = !opts?.force ? threadCache.current.get(id) : undefined;
    if (cached) {
      setLeadDetail(cached.lead);
      setNotes(typeof cached.lead.managerNotes === "string" ? cached.lead.managerNotes : "");
      setLabelDraft(cached.lead.displayLabel ?? "");
      setThread(cached.messages);
      syncThreadCursor(cached.messages);
      return;
    }
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/leads-manager/leads/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const lead = data.lead as LeadDetail;
      const messages = (data.messages ?? []) as ChatMessage[];
      threadCache.current.set(id, { lead, messages });
      setLeadDetail(lead);
      setNotes(typeof lead.managerNotes === "string" ? lead.managerNotes : "");
      setLabelDraft(lead.displayLabel ?? "");
      setThread(messages);
      syncThreadCursor(messages);
    } finally {
      setLoadingThread(false);
    }
  };

  const closeChat = () => {
    setSelectedId(null);
    setThread([]);
    setLeadDetail(null);
    setNotes("");
    setLabelDraft("");
    setReply("");
    setPendingMeta(null);
    setShortcutError(null);
    threadLastMsgIdRef.current = "";
  };

  const postToGuest = async (
    body: Record<string, unknown>,
    optimisticContent: string,
    optimisticMeta?: Record<string, unknown> | null
  ) => {
    if (!selectedId || sendInFlightRef.current) return false;
    sendInFlightRef.current = true;
    const tmpId = `tmp-host-${Date.now()}`;
    setThread((t) => [
      ...t,
      {
        id: tmpId,
        role: "ASSISTANT" as const,
        content: optimisticContent,
        imageUrl: null,
        metadata: optimisticMeta ?? { sentBy: "manager" },
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const res = await fetch(`/api/leads-manager/leads/${selectedId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setThread((t) => t.filter((m) => m.id !== tmpId));
        return false;
      }
      const data = await res.json();
      const msg = data.message as ChatMessage;
      setThread((t) => {
        const next = [...t.filter((m) => m.id !== tmpId), msg];
        syncThreadCursor(next);
        if (leadDetail) {
          threadCache.current.set(selectedId, { lead: leadDetail, messages: next });
        }
        return next;
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? {
                ...l,
                preview: msg.content.slice(0, 80) || optimisticContent.slice(0, 80),
                lastMessageAt: new Date().toISOString(),
              }
            : l
        )
      );
      return true;
    } finally {
      sendInFlightRef.current = false;
    }
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sendInFlightRef.current) return;
    const text = reply.trim();
    const meta = pendingMeta;
    setReply("");
    setPendingMeta(null);
    setShortcutError(null);
    const ok = await postToGuest(
      meta ? { message: text, metadata: meta } : { message: text },
      text,
      meta
    );
    if (!ok) {
      setReply(text);
      setPendingMeta(meta);
    }
  };

  const loadShortcut = (shortcut: ManagerShortcutId) => {
    if (!leadDetail) return;
    const built = buildManagerShortcut(shortcut, {
      brandId: leadDetail.brandId,
      guestName: leadDetail.guestName,
      selectedEventId: leadDetail.selectedEventId ?? null,
      selectedEventName: leadDetail.selectedEventName,
      contactNumber: leadDetail.contactNumber,
    });
    if (!built) {
      setShortcutError(
        shortcut === "book_event"
          ? "Guest hasn't picked an event yet"
          : shortcut === "whatsapp"
            ? "WhatsApp link unavailable for this outlet"
            : "That shortcut isn't available"
      );
      return;
    }
    setShortcutError(null);
    setReply(built.content);
    setPendingMeta(built.metadata);
  };

  const sendAttachment = async (file: File, caption?: string) => {
    if (!selectedId || uploading || sendInFlightRef.current) return;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    const tmpId = `tmp-file-${Date.now()}`;
    const optimisticContent = caption?.trim() || (file.type.startsWith("image/") ? "Sharing a photo…" : "Sending document…");

    setThread((t) => [
      ...t,
      {
        id: tmpId,
        role: "ASSISTANT" as const,
        content: optimisticContent,
        imageUrl: previewUrl,
        metadata: {
          sentBy: "manager",
          type: "attachment",
          mimeType: file.type,
          fileName: file.name,
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (caption?.trim()) fd.append("caption", caption.trim());
      const res = await fetch(`/api/leads-manager/leads/${selectedId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        setThread((t) => t.filter((m) => m.id !== tmpId));
        return;
      }
      const data = await res.json();
      const msg = data.message as ChatMessage;
      setThread((t) => {
        const next = [...t.filter((m) => m.id !== tmpId), msg];
        syncThreadCursor(next);
        if (leadDetail) threadCache.current.set(selectedId, { lead: leadDetail, messages: next });
        return next;
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedId
            ? {
                ...l,
                preview: msg.content.slice(0, 80),
                lastMessageAt: new Date().toISOString(),
              }
            : l
        )
      );
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setUploading(false);
    }
  };

  const onPickAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let uploadFile = file;
    if (file.type.startsWith("image/") && file.size > 900_000) {
      try {
        const { compressImageToMaxBytes } = await import("@/lib/compress-image");
        const blob = await compressImageToMaxBytes(file, 900_000);
        uploadFile = new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
          type: blob.type || "image/webp",
        });
      } catch {
        uploadFile = file;
      }
    }
    await sendAttachment(uploadFile);
  };

  const patchLead = async (body: Record<string, unknown>) => {
    if (!selectedId) return;
    const res = await fetch(`/api/leads-manager/leads/${selectedId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = await res.json();
    const updated = data.lead as LeadDetail;
    setLeadDetail(updated);
    if (typeof body.displayLabel === "string") {
      setLabelDraft(updated.displayLabel);
    }
    if (typeof body.managerNotes === "string") {
      setNotes(updated.managerNotes ?? "");
    }
    const cached = threadCache.current.get(selectedId);
    if (cached) {
      threadCache.current.set(selectedId, { ...cached, lead: updated });
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? {
              ...l,
              displayLabel: updated.displayLabel,
              status: updated.status,
              guestName: updated.guestName,
              contactNumber: updated.contactNumber,
            }
          : l
      )
    );
  };

  const saveNotes = async () => {
    if (!selectedId || savingNotes) return;
    setSavingNotes(true);
    try {
      await patchLead({ managerNotes: notes });
    } finally {
      setSavingNotes(false);
    }
  };

  const saveLabel = async () => {
    if (!selectedId || savingLabel || !labelDraft.trim()) return;
    setSavingLabel(true);
    try {
      await patchLead({ displayLabel: labelDraft.trim() });
    } finally {
      setSavingLabel(false);
    }
  };

  const takeOver = () => patchLead({ status: "HANDED_OFF" });
  const resumeAi = () => patchLead({ status: "IN_PROGRESS" });

  const shellStyle = {
    backgroundColor: "#050508",
    backgroundImage: neon.mesh,
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white" style={shellStyle}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: neon.cyan }}
        />
      </div>
    );
  }

  if (!authed) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-white"
        style={shellStyle}
      >
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ background: neon.titleGradient, WebkitBackgroundClip: "text", color: "transparent" }}
        >
          Leads Manager
        </h1>
        <p className="mt-2 text-sm text-white/45">Venue chat inbox · password required</p>
        <form onSubmit={login} className="mt-8 w-full max-w-xs space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-sm outline-none backdrop-blur focus:border-cyan-500/40"
            autoComplete="current-password"
          />
          {loginError ? <p className="text-xs text-red-400">{loginError}</p> : null}
          <button
            type="submit"
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-black"
            style={{ background: neon.sendGradient }}
          >
            Unlock inbox
          </button>
        </form>
      </div>
    );
  }

  const selectedLead = leads.find((l) => l.id === selectedId);
  const inChat = Boolean(selectedId);
  const venueBrand = selectedLead ? BRANDS.find((b) => b.id === selectedLead.brandId) : null;
  const accentColor = venueBrand?.accentColor ?? neon.cyan;
  const subtitle = selectedLead ? leadSubtitle(selectedLead) : "";

  return (
    <div
      className={`mx-auto flex w-full flex-col text-white ${inChat ? "h-[100dvh] max-h-[100dvh]" : "min-h-[100dvh]"} max-w-lg`}
      style={shellStyle}
    >
      {!inChat ? (
        <>
          <header
            className="sticky top-0 z-10 border-b border-white/[0.06] px-4 py-3 backdrop-blur-xl"
            style={{ background: neon.headerGradient }}
          >
            <div className="flex items-center justify-between">
              <h1
                className="text-lg font-bold"
                style={{ background: neon.titleGradient, WebkitBackgroundClip: "text", color: "transparent" }}
              >
                Inbox
              </h1>
              <button
                type="button"
                onClick={() => {
                  fetch("/api/leads-manager/auth", { method: "DELETE", credentials: "include" });
                  setAuthed(false);
                }}
                className="rounded-full px-3 py-1 text-[11px] text-white/45 hover:bg-white/5"
              >
                Lock
              </button>
            </div>
            <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setBrandFilter("")}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                  !brandFilter
                    ? "text-black shadow-lg shadow-cyan-500/20"
                    : "bg-white/[0.06] text-white/70 hover:bg-white/10"
                }`}
                style={!brandFilter ? { background: neon.sendGradient } : undefined}
              >
                All
              </button>
              {inboxBrands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBrandFilter(b.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                    brandFilter === b.id
                      ? "text-black shadow-lg shadow-cyan-500/20"
                      : "bg-white/[0.06] text-white/70 hover:bg-white/10"
                  }`}
                  style={brandFilter === b.id ? { background: neon.sendGradient } : undefined}
                >
                  {b.shortName}
                </button>
              ))}
            </div>
          </header>

          {brandFilter ? (
            <OutletSettingsCard
              brandId={brandFilter}
              onReset={() => {
                threadCache.current.clear();
                loadLeads(brandFilter).catch(() => {});
                setSelectedId(null);
              }}
            />
          ) : null}

          <ul className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
            {leads.length === 0 ? (
              <li className="p-12 text-center text-sm text-white/35">
                {brandFilter ? "No chats yet — pick an outlet or wait for guests." : "No chats yet"}
              </li>
            ) : (
              leads.map((l) => {
                const brand = BRANDS.find((b) => b.id === l.brandId);
                const sub = leadSubtitle(l);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => openLead(l.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.04]"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-black"
                        style={{ background: neon.sendGradient }}
                      >
                        {leadInitial(l)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[15px] font-semibold">{l.displayLabel}</p>
                          <span className="shrink-0 text-[10px] text-white/40">
                            {formatListTime(l.lastMessageAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] text-white/45">
                            {brand?.shortName ?? l.brandId}
                            {sub ? ` · ${sub}` : ""}
                            {l.selectedEventName ? ` · ${l.selectedEventName}` : ""}
                            {l.preview ? ` · ${l.preview}` : ""}
                          </p>
                          {l.status !== "CLOSED" && l.status !== "BOOKED" ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: neon.liveDot }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <header
            className="shrink-0 border-b border-white/[0.06] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl"
            style={{ background: neon.headerGradient }}
          >
            <div className="flex items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={closeChat}
                className="rounded-full p-2 text-white/75 hover:bg-white/10"
                aria-label="Back to all chats"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{selectedLead?.displayLabel ?? "Lead"}</p>
                <p className="truncate text-[11px] text-white/45">
                  {[venueBrand?.shortName, subtitle, leadDetail?.contactNumber].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTools((v) => !v)}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-white/60 hover:bg-white/5"
              >
                {showTools ? "Close" : "Tools"}
              </button>
              {leadDetail?.contactNumber ? (
                <a
                  href={`tel:+91${leadDetail.contactNumber.replace(/\D/g, "").slice(-10)}`}
                  className="rounded-full p-2 text-white/75 hover:bg-white/10"
                  aria-label="Call guest"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </a>
              ) : null}
            </div>

            <div className="flex gap-1.5 overflow-x-auto border-t border-white/[0.06] px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {leads.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => openLead(l.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    l.id === selectedId ? "text-black" : "bg-white/[0.06] text-white/65 hover:bg-white/10"
                  }`}
                  style={l.id === selectedId ? { background: neon.sendGradient } : undefined}
                >
                  {l.displayLabel}
                </button>
              ))}
            </div>
          </header>

          {showTools ? (
            <div className="max-h-[45vh] shrink-0 overflow-y-auto border-b border-white/[0.06] bg-black/20">
              <div className="flex items-center gap-2 px-4 py-2.5">
                <select
                  value={leadDetail?.status ?? "NEW"}
                  onChange={(e) => patchLead({ status: e.target.value })}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase text-white/80 outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={takeOver}
                  disabled={leadDetail?.status === "HANDED_OFF"}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-40"
                >
                  Pause AI
                </button>
                {leadDetail?.status === "HANDED_OFF" ? (
                  <button
                    type="button"
                    onClick={resumeAi}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-300"
                  >
                    Resume AI
                  </button>
                ) : null}
              </div>

              <div className="border-t border-white/[0.06] px-4 py-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  Rename lead
                </p>
                <div className="flex gap-2">
                  <input
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    placeholder="e.g. Rahul, Table 5, VIP"
                    maxLength={40}
                    className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px] outline-none focus:border-cyan-500/40"
                  />
                  <button
                    type="button"
                    onClick={saveLabel}
                    disabled={savingLabel || !labelDraft.trim()}
                    className="shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold text-black disabled:opacity-40"
                    style={{ background: neon.sendGradient }}
                  >
                    Save
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-white/35">Only this lead — others keep their labels.</p>
              </div>

              <BookingPanel lead={leadDetail} />

              <div className="border-t border-white/[0.06] px-4 py-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes (not visible to guest)…"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-[12px] outline-none placeholder:text-white/30 focus:border-cyan-500/40"
                />
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="mt-2 text-[11px] font-semibold text-cyan-300 disabled:opacity-40"
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </div>
            </div>
          ) : null}

          <div ref={threadRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3">
            {loadingThread ? (
              <div className="space-y-3 py-4">
                <ChatTypingIndicator label="Loading chat…" align="right" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <p className="text-sm font-medium text-white/50">
                  {hasGuestUserMessage ? "No visible messages" : "No guest reply yet"}
                </p>
                <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-white/35">
                  {hiddenWelcomeCount > 0
                    ? `Guest opened chat (${hiddenWelcomeCount} welcome/event card${hiddenWelcomeCount === 1 ? "" : "s"} hidden here).`
                    : "This lead has no messages stored yet."}
                  {hasGuestUserMessage
                    ? " Try refreshing or check another lead."
                    : " When they type, you'll see it here. Use quick send below to nudge them."}
                </p>
              </div>
            ) : (
              chatMessages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  m={m}
                  perspective="manager"
                  accentColor={accentColor}
                  size="md"
                  variant="minimal"
                  suppressFlyers
                />
              ))
            )}
          </div>

          <div
            className="shrink-0 backdrop-blur-xl"
            style={{ background: neon.headerGradient }}
          >
            <ManagerQuickSendBar
              hasSelectedEvent={Boolean(leadDetail?.selectedEventId)}
              disabled={uploading}
              onPick={loadShortcut}
            />
            <div className="border-t border-white/[0.06] px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {shortcutError ? (
                <p className="mb-2 px-1 text-[11px] text-amber-300/90">{shortcutError}</p>
              ) : null}
              {pendingMeta && shortcutDraftLabel(pendingMeta) ? (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
                    + {shortcutDraftLabel(pendingMeta)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingMeta(null)}
                    className="text-[10px] text-white/40 hover:text-white/70"
                  >
                    Remove link
                  </button>
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={(e) => void onPickAttachment(e)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg disabled:opacity-40"
                  aria-label="Send photo or document"
                >
                  {uploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                  ) : (
                    "+"
                  )}
                </button>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  disabled={uploading}
                  className="min-h-[48px] flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-[16px] outline-none placeholder:text-white/35 disabled:opacity-50 focus:border-cyan-500/30"
                  onKeyDown={(e) => e.key === "Enter" && !uploading && void sendReply()}
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={uploading || !reply.trim()}
                  className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full text-lg font-bold text-black disabled:opacity-40"
                  style={{ background: neon.sendGradient }}
                  aria-label="Send reply"
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
