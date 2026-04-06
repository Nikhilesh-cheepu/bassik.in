"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { guestEventDateLine } from "@/lib/event-date-display";

export type EventOption = {
  id: string;
  imageUrl: string;
  title: string | null;
  eventDate: string | null;
  entryLabel: string | null;
  capacityText: string | null;
};

interface EventSelectorPopdownProps {
  isOpen: boolean;
  events: EventOption[];
  selectedEventId: string | null;
  onClose: () => void;
  onSelect: (eventId: string) => void;
}

function getEventTitle(event: EventOption, index: number) {
  return event.title?.trim() || `Event ${index + 1}`;
}

export default function EventSelectorPopdown({
  isOpen,
  events,
  selectedEventId,
  onClose,
  onSelect,
}: EventSelectorPopdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-md rounded-b-3xl border-b border-white/15 bg-[#05070c]/95 p-4 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Select event</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {events.map((event, index) => {
                const isSelected = selectedEventId === event.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      onSelect(event.id);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                      isSelected
                        ? "border-white/40 bg-white/12"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/10">
                      <Image
                        src={event.imageUrl}
                        alt={getEventTitle(event, index)}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{getEventTitle(event, index)}</p>
                      <p className="truncate text-[11px] text-white/70">{guestEventDateLine(event.eventDate)}</p>
                      <p className="truncate text-[11px] text-white/55">
                        {[event.entryLabel, event.capacityText].filter(Boolean).join(" • ") || "General entry"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

