"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type { ColumnMapping, AutomationColumnTarget } from "@/lib/automation/types";
import { MAPPING_TARGETS } from "@/lib/automation/types";
import AutomationImportChatClient from "./AutomationImportChatClient";

type ParseResponse = {
  fileName: string;
  sourceKind?: "xlsx" | "image" | "pdf";
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  suggestedMapping: ColumnMapping[];
  openaiConfigured: boolean;
  truncatedList?: boolean;
};

const FILE_ACCEPT =
  ".xlsx,.xls,.pdf,image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function isAllowedUpload(f: File): boolean {
  const n = f.name.toLowerCase();
  if (/\.(xlsx?|pdf|jpe?g|png|webp|gif)$/i.test(n)) return true;
  const t = f.type.toLowerCase();
  if (t.startsWith("image/") || t === "application/pdf") return true;
  if (t.includes("spreadsheet") || t.includes("excel")) return true;
  return false;
}

type ImportRow = {
  id: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
};

type ContactRow = {
  id: string;
  fullName: string | null;
  phone: string;
  venue: string | null;
  extra: unknown;
};

export default function AutomationsPageClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  const [imports, setImports] = useState<ImportRow[]>([]);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const activeImport = activeImportId ? imports.find((imp) => imp.id === activeImportId) ?? null : null;
  const canUseAutomationChat = Boolean(activeImportId && contacts.length > 0);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<{
    fileName: string;
    rowCount: number;
    headers: string[];
  } | null>(null);

  const [message, setMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [twilioStatus, setTwilioStatus] = useState<{
    configured: boolean;
    fromMasked: string | null;
    accountSidSuffix: string | null;
  } | null>(null);
  const [sendProgress, setSendProgress] = useState<string | null>(null);

  const loadImports = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/automations/imports");
      const data = (await res.json().catch(() => ({}))) as {
        imports?: ImportRow[];
        warning?: string;
      };
      setImports(data.imports || []);
      if (data.warning) setNotice(data.warning);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/automations/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data || typeof data.configured !== "boolean") return;
        setTwilioStatus({
          configured: data.configured,
          fromMasked: data.fromMasked ?? null,
          accountSidSuffix: data.accountSidSuffix ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setTwilioStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeImportId) {
      setContacts([]);
      setSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    setContactsLoading(true);
    fetch(`/api/admin/automations/contacts?importId=${encodeURIComponent(activeImportId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load contacts");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setContacts(data.contacts || []);
          setSelectedIds(new Set());
        }
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeImportId]);

  const setFileAndClear = useCallback((f: File | null) => {
    setError(null);
    setNotice(null);
    if (f && !isAllowedUpload(f)) {
      setFile(null);
      setParsed(null);
      setMappings([]);
      setAnalysisSnapshot(null);
      setError("Use Excel (.xlsx), PDF, or an image (JPEG, PNG, WebP).");
      return;
    }
    setFile(f);
    setParsed(null);
    setMappings([]);
    setAnalysisSnapshot(null);
  }, []);

  const runParse = useCallback(async () => {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setParseLoading(true);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/automations/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      const p = data as ParseResponse;
      setParsed(p);
      setMappings(p.suggestedMapping || []);
      setAnalysisSnapshot({
        fileName: file.name,
        rowCount: p.rowCount,
        headers: p.headers || [],
      });
      const dateHint = p.headers?.some((h) => /visit[_\s-]*date/i.test(h))
        ? "Detected `visit_date` ✅. "
        : "No `visit_date` found. ";
      const typeHint = p.headers?.some((h) => /visit[_\s-]*type/i.test(h))
        ? "Detected `visit_type` ✅."
        : "No `visit_type` found.";
      const previewHeaders = (p.headers || []).slice(0, 10);
      let n =
        `Uploaded ${file.name}. AI analyzed ${p.rowCount} rows. ` +
        dateHint +
        typeHint +
        ` Headers: ${previewHeaders.join(", ")}.`;
      if (p.truncatedList) {
        n +=
          " Note: only part of a very long list could fit in one step — split the file or use Excel for huge lists.";
      }
      setNotice(n);
    } catch (e) {
      let m = e instanceof Error ? e.message : "Something went wrong.";
      if (/Unexpected token|JSON|unterminated/i.test(m) && m.length < 80) {
        m =
          "The file may be too large for one step. Try Excel, a smaller PDF, or split the PDF.";
      }
      setError(m);
    } finally {
      setParseLoading(false);
    }
  }, [file]);

  const runImport = useCallback(async () => {
    if (!file || !mappings.length) {
      setError("Use Read with AI first, then save.");
      return;
    }
    setImportLoading(true);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mapping", JSON.stringify(mappings));
      const res = await fetch("/api/admin/automations/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setNotice(
        `Saved ${data.savedCount} contacts${data.skippedRows ? ` (${data.skippedRows} rows skipped — no phone)` : ""}.`
      );
      setParsed(null);
      setMappings([]);
      setFile(null);
      await loadImports();
      if (data.importId) {
        setActiveImportId(data.importId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportLoading(false);
    }
  }, [file, mappings, loadImports]);

  const updateMapping = useCallback((sourceColumn: string, patch: Partial<ColumnMapping>) => {
    setMappings((prev) =>
      prev.map((m) => (m.sourceColumn === sourceColumn ? { ...m, ...patch } : m))
    );
  }, []);

  const toggleContact = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllContacts = useCallback(() => {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  }, [contacts]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const sendWhatsApp = useCallback(
    async (mode: "test" | "selected" | "all") => {
      setSendLoading(true);
      setError(null);
      setNotice(null);
      setSendProgress(null);
      try {
        if (mode === "test") {
          const testPhoneTrimmed = testPhone.trim();
          if (!testPhoneTrimmed) throw new Error("Enter a test phone number (with country code).");
          const res = await fetch("/api/admin/automations/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, testPhone: testPhoneTrimmed }),
          });
          const data = (await res.json()) as {
            error?: string;
            twilioCode?: number;
            hint?: string;
          };
          if (!res.ok) {
            const parts = [data.error || "WhatsApp send failed"];
            if (data.hint) parts.push(data.hint);
            throw new Error(parts.join(" — "));
          }
          setNotice(
            "Test WhatsApp message accepted by Twilio. Check the handset (sandbox users must join first)."
          );
          return;
        }

        let allIds: string[];
        if (mode === "all") {
          if (!contacts.length) {
            throw new Error("Pick a saved list in Step 3 — no contacts loaded.");
          }
          const ok = window.confirm(
            `Send this exact message to all ${contacts.length} contacts in this import? Twilio will charge per message.`
          );
          if (!ok) return;
          allIds = contacts.map((c) => c.id);
        } else {
          allIds = Array.from(selectedIds);
          if (!allIds.length) throw new Error("Select at least one contact, or use “everyone in this list”.");
        }

        const BATCH = 100;
        let totalSent = 0;
        let totalFailed = 0;
        const batches = Math.ceil(allIds.length / BATCH);

        for (let b = 0; b < batches; b++) {
          const contactIds = allIds.slice(b * BATCH, (b + 1) * BATCH);
          setSendProgress(`Sending batch ${b + 1} of ${batches} (${contactIds.length} numbers)…`);

          const res = await fetch("/api/admin/automations/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, contactIds }),
          });
          const data = (await res.json()) as {
            sent?: number;
            failed?: number;
            error?: string;
            hint?: string;
          };
          if (!res.ok) {
            const parts = [data.error || "WhatsApp send failed"];
            if (data.hint) parts.push(data.hint);
            throw new Error(parts.join(" — "));
          }

          totalSent += data.sent ?? 0;
          totalFailed += data.failed ?? 0;
        }

        setSendProgress(null);
        setNotice(
          `Bulk send finished: ${totalSent} sent, ${totalFailed} failed (all batches). Check Twilio logs for details.`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Send failed.");
      } finally {
        setSendLoading(false);
        setSendProgress(null);
      }
    },
    [message, testPhone, selectedIds, contacts]
  );

  const sampleTable = useMemo(() => {
    if (!parsed?.sampleRows.length) return null;
    const cols = parsed.headers;
    return (
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50">
            <tr>
              {cols.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {parsed.sampleRows.map((row, i) => (
              <tr key={i}>
                {cols.map((h) => (
                  <td key={h} className="max-w-[12rem] truncate px-3 py-2 text-slate-600" title={row[h]}>
                    {row[h] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [parsed]);

  return (
    <AdminShell title="Automations">
      <div className="space-y-6 sm:space-y-8">
        {(error || notice) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
          </div>
        )}

        <section
          id="spreadsheet"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="spreadsheet-heading"
        >
          <h3 id="spreadsheet-heading" className="text-base font-semibold text-slate-900">
            Step 1 — Upload and read
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose a file, then <strong className="font-medium text-slate-700">Read with AI</strong>. After that,
            fix columns if needed and <strong className="font-medium text-slate-700">Save to database</strong>.
          </p>

          <div
            className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              isDragging ? "border-orange-400 bg-orange-50/50" : "border-slate-200 bg-slate-50/40"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFileAndClear(f);
            }}
          >
            <p className="text-sm font-medium text-slate-800">Drop a file or browse</p>
            <p className="mt-1 text-xs text-slate-500">Excel, PDF, or picture (PNG / JPG / WebP)</p>
            <label className="mt-4 cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
                Choose file
              </span>
              <input
                type="file"
                accept={FILE_ACCEPT}
                className="sr-only"
                onChange={(e) => setFileAndClear(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <p className="mt-3 max-w-md truncate text-xs text-emerald-800">
                Uploaded: <span className="font-medium text-emerald-900">{file.name}</span>
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={!file || parseLoading}
                onClick={() => void runParse()}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {parseLoading ? "Reading…" : "Read with AI"}
              </button>
              {parsed && (
                <button
                  type="button"
                  disabled={importLoading}
                  onClick={() => void runImport()}
                  className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
                >
                  {importLoading ? "Saving…" : "Save to database"}
                </button>
              )}
            </div>
          </div>

          {parsed && (
            <div className="mt-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-900">AI analysis complete</p>
                <p className="mt-1 text-xs text-emerald-800/90">
                  {parsed.rowCount} rows extracted ·{" "}
                  {parsed.headers.some((h) => /visit[_\s-]*date/i.test(h)) ? "visit_date ✅" : "visit_date —"} ·{" "}
                  {parsed.headers.some((h) => /visit[_\s-]*type/i.test(h)) ? "visit_type ✅" : "visit_type —"}
                </p>
              </div>

              <div className="mt-3">{sampleTable}</div>

              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Edit column mapping (advanced)
                </summary>
                <p className="mt-2 text-xs text-slate-500">
                  Only change this if the AI mapped columns incorrectly. Phone must be mapped for WhatsApp sends.
                </p>
                <div className="mt-3 space-y-2">
                  {mappings.map((m) => (
                    <div
                      key={m.sourceColumn}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <span
                        className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800"
                        title={m.sourceColumn}
                      >
                        {m.sourceColumn}
                      </span>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                        value={m.target}
                        onChange={(e) =>
                          updateMapping(m.sourceColumn, {
                            target: e.target.value as AutomationColumnTarget,
                            extraKey: e.target.value === "extra" ? m.extraKey : undefined,
                          })
                        }
                      >
                        {MAPPING_TARGETS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {m.target === "extra" && (
                        <input
                          type="text"
                          placeholder="extra key (e.g. age)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:w-40"
                          value={m.extraKey || ""}
                          onChange={(e) => updateMapping(m.sourceColumn, { extraKey: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Step 3 — {activeImportId ? "Contacts loaded" : "Your saved lists"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {activeImportId
              ? `Using ${activeImport?.fileName ?? "your latest upload"}`
              : "Pick a past upload to see people. Tick names to message them below."}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {activeImportId ? (
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">
                  Using: {activeImport?.fileName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Refresh to reload contacts ({contacts.length} loaded).
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600">Which upload?</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={activeImportId || ""}
                  onChange={(e) => setActiveImportId(e.target.value || null)}
                >
                  <option value="">— Select —</option>
                  {imports.map((imp) => (
                    <option key={imp.id} value={imp.id}>
                      {imp.fileName} · {imp.rowCount} rows ·{" "}
                      {new Date(imp.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadImports()}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh list
            </button>
          </div>

          {contactsLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading contacts…</p>
          ) : activeImportId && contacts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No contacts for this import.</p>
          ) : contacts.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllContacts}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  Select all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Clear
                </button>
                <span className="text-xs text-slate-500">
                  {selectedIds.size} selected · {contacts.length} loaded (max 10k per import)
                </span>
              </div>
              <div className="max-h-[min(420px,50vh)] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="w-10 px-2 py-2" />
                      <th className="px-2 py-2 font-semibold text-slate-700">Name</th>
                      <th className="px-2 py-2 font-semibold text-slate-700">Phone</th>
                      <th className="px-2 py-2 font-semibold text-slate-700">Venue</th>
                      <th className="px-2 py-2 font-semibold text-slate-700">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {contacts.map((c) => (
                      <tr key={c.id} className={selectedIds.has(c.id) ? "bg-orange-50/40" : ""}>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleContact(c.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-2 py-2 text-slate-800">{c.fullName || "—"}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-700">{c.phone}</td>
                        <td className="px-2 py-2 text-slate-600">{c.venue || "—"}</td>
                        <td className="max-w-[10rem] truncate px-2 py-2 text-slate-500" title={JSON.stringify(c.extra)}>
                          {c.extra != null ? JSON.stringify(c.extra) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        {activeImportId && !contactsLoading && contacts.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Automation chat</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ask here for visit frequency / outlet interaction, or ask to generate a WhatsApp bulk template and then click “Send now”.
            </p>
            <div className="mt-3">
              <AutomationImportChatClient
                key={activeImportId}
                contactsCount={contacts.length}
                initialAssistantMessage={
                  analysisSnapshot
                    ? `AI summary for ${analysisSnapshot.fileName}\n` +
                      `- Rows extracted: ${analysisSnapshot.rowCount}\n` +
                      `- visit_date detected: ${analysisSnapshot.headers.some((h) => /visit[_\\s-]*date/i.test(h)) ? "yes" : "no"}\n` +
                      `- visit_type detected: ${analysisSnapshot.headers.some((h) => /visit[_\\s-]*type/i.test(h)) ? "yes" : "no"}\n` +
                      `- Detected headers: ${analysisSnapshot.headers.slice(0, 12).join(", ") || "—"}`
                    : null
                }
              />
            </div>
          </section>
        )}

        <section
          id="messaging"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="messaging-heading"
        >
          <h3 id="messaging-heading" className="text-base font-semibold text-slate-900">
            Step 4 — WhatsApp (Twilio)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {canUseAutomationChat ? (
              <>
                Use the <strong className="font-medium text-slate-700">Automation chat</strong> above to draft a template and
                click <strong className="font-medium text-slate-700">Send now</strong>.
              </>
            ) : (
              <>
                Test first, then use the manual sending options below. Sends run in batches of 100 with a short pause
                between each message inside a batch.
              </>
            )}
          </p>

          {twilioStatus && (
            <div
              className={`mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                twilioStatus.configured
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
              role="status"
            >
              <span className="font-semibold">
                {twilioStatus.configured ? "Twilio connected" : "Twilio not configured"}
              </span>
              {twilioStatus.configured && (
                <span className="text-emerald-800/90">
                  From {twilioStatus.fromMasked ?? "—"} · Account …{twilioStatus.accountSidSuffix ?? "—"}
                </span>
              )}
              {!twilioStatus.configured && (
                <span>Add the three env vars below and restart the server.</span>
              )}
            </div>
          )}

          {!twilioStatus?.configured && (
            <details className="mt-2 text-xs text-slate-500">
              <summary className="cursor-pointer font-medium text-slate-600">Twilio setup (one time)</summary>
              <ol className="mt-2 list-inside list-decimal space-y-2 pl-1 text-slate-700">
                <li>
                  In{" "}
                  <a
                    href="https://console.twilio.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-orange-700 underline"
                  >
                    Twilio Console
                  </a>
                  , open <strong>Account</strong> → copy <strong>Account SID</strong> and <strong>Auth Token</strong>.
                </li>
                <li>
                  Under <strong>Messaging</strong> → <strong>Try it out</strong> →{" "}
                  <strong>Send a WhatsApp message</strong>, use the sandbox <strong>From</strong> number (e.g.{" "}
                  <code className="rounded bg-slate-100 px-1">whatsapp:+14155238886</code>) until your business
                  number is approved.
                </li>
                <li>
                  For sandbox: each recipient must join with the code Twilio shows (send &quot;join …&quot; to the
                  sandbox number from WhatsApp).
                </li>
                <li>
                  Add to <code className="rounded bg-slate-100 px-1">.env.local</code> (then restart{" "}
                  <code className="rounded bg-slate-100 px-1">npm run dev</code>):
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100">
                    {`TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`}
                  </pre>
                  For production, replace{" "}
                  <code className="rounded bg-slate-100 px-1">TWILIO_WHATSAPP_FROM</code> with your Twilio WhatsApp
                  sender (approved template rules apply).
                </li>
              </ol>
            </details>
          )}

          {canUseAutomationChat ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-sm font-semibold text-emerald-900">Send from chat (recommended)</p>
              <p className="mt-1 text-xs text-emerald-800/90">
                Use the “Automation chat” above to ask for counts/templates and click <strong>Send now</strong>.
              </p>
            </div>
          ) : (
            <>
              <label className="mt-4 block text-xs font-medium text-slate-600">Message</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                rows={4}
                placeholder="Write the message people will receive…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Test to one number</p>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="+91… or join sandbox first"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={sendLoading}
                    onClick={() => void sendWhatsApp("test")}
                    className="mt-2 w-full rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                  >
                    {sendLoading ? "Sending…" : "Send test WhatsApp"}
                  </button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Bulk — selected rows only</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tick people in the table (or Select all). Same batching as above.
                  </p>
                  <button
                    type="button"
                    disabled={sendLoading || selectedIds.size === 0}
                    onClick={() => void sendWhatsApp("selected")}
                    className="mt-4 w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {sendLoading ? "Sending…" : `WhatsApp ${selectedIds.size} selected`}
                  </button>
                </div>
              </div>

              {sendProgress && (
                <p className="mt-3 text-sm font-medium text-slate-700" aria-live="polite">
                  {sendProgress}
                </p>
              )}
            </>
          )}

        </section>
      </div>
    </AdminShell>
  );
}
