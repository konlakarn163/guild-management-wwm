"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Pencil, Play, Plus, RotateCcw, Save, Settings2, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/client-auth";
import { getRealtimeSocket } from "@/lib/realtime";
import type {
  CommandAnnouncementMessages,
  CommandAnnouncementRealtimeUpdate,
  CommandAnnouncementState,
} from "@/lib/types";
import { Button } from "@/components/ui/button";

const API_PATH = "/api/command-announcements";
const ANNOUNCEMENT_DURATION_SECONDS = 1800;
const START_OPTIONS = [
  { label: "เริ่มเลย", seconds: 0 },
  { label: "30 วินาที", seconds: 30 },
  { label: "1 นาที", seconds: 60 },
  { label: "2 นาที", seconds: 120 },
  { label: "3 นาที", seconds: 180 },
  { label: "4 นาที", seconds: 240 },
];

interface DraftCommandMessage {
  id: string;
  seconds: string;
  msg: string;
}

function buildCommandAnnouncementMessages(drafts: DraftCommandMessage[]): CommandAnnouncementMessages {
  const messages: CommandAnnouncementMessages = {};

  for (const draft of drafts) {
    const seconds = Number(draft.seconds);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > ANNOUNCEMENT_DURATION_SECONDS) {
      throw new Error("เวลาแจ้งเตือนต้องอยู่ระหว่าง 1 ถึง 1,800 วินาที");
    }

    const key = String(seconds);
    if (key in messages) {
      throw new Error(`มีรายการเวลา ${seconds} วินาทีซ้ำกัน`);
    }

    const msg = draft.msg.trim();
    if (!msg) {
      throw new Error(`กรุณาใส่ข้อความสำหรับเวลา ${seconds} วินาที`);
    }

    messages[key] = { msg };
  }

  return messages;
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatDurationLabel(value: string): string {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 1) return "กรอกเวลาเป็นวินาที";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const parts = [
    ...(minutes > 0 ? [`${minutes} นาที`] : []),
    ...(remainingSeconds > 0 ? [`${remainingSeconds} วินาที`] : []),
  ];
  return `เหลือ ${parts.join(" ")}`;
}

function parseMinutesSeconds(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return Number.NaN;

  const minutes = Number(match[1]);
  const seconds = Number(match[2] ?? 0);
  if (seconds > 59) return Number.NaN;

  return minutes * 60 + seconds;
}

function getDisplayTime(state: CommandAnnouncementState, now: number): { label: string; time: string } {
  if (state.phase === "waiting" && state.scheduled_start_at) {
    const untilStart = Math.ceil((Date.parse(state.scheduled_start_at) - now) / 1000);
    if (untilStart > 0) return { label: "เริ่มรอบใน", time: formatTime(untilStart) };
    return { label: "เวลาที่เหลือ", time: formatTime(ANNOUNCEMENT_DURATION_SECONDS - Math.floor((now - Date.parse(state.scheduled_start_at)) / 1000)) };
  }

  if (state.phase === "running" && state.started_at) {
    const elapsed = Math.floor((now - Date.parse(state.started_at)) / 1000);
    return { label: "เวลาที่เหลือ", time: formatTime(ANNOUNCEMENT_DURATION_SECONDS - elapsed) };
  }

  if (state.phase === "completed") return { label: "สิ้นสุดรอบ", time: "00:00" };
  return { label: "พร้อมเริ่ม", time: "30:00" };
}

export function CommandAnnouncementPanel() {
  const [state, setState] = useState<CommandAnnouncementState | null>(null);
  const [selectedDelay, setSelectedDelay] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [draftMessages, setDraftMessages] = useState<DraftCommandMessage[]>([]);
  const [editingTime, setEditingTime] = useState<{ id: string; seconds: string } | null>(null);
  const [newTimeSeconds, setNewTimeSeconds] = useState("");
  const [minutesToConvert, setMinutesToConvert] = useState("1");
  const [conversionMessage, setConversionMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdownPhase = state?.phase;
  const countdownStartedAt = state?.started_at;

  useEffect(() => {
    let isMounted = true;
    let hasConnected = false;
    let latestRealtimeUpdate: CommandAnnouncementRealtimeUpdate | null = null;
    const socket = getRealtimeSocket();
    const loadState = async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
        const nextState = await apiFetch<CommandAnnouncementState>(API_PATH, { token });
        if (isMounted) {
          const latestUpdate = latestRealtimeUpdate;
          setState(latestUpdate && latestUpdate.updated_at > nextState.updated_at
            ? { ...nextState, ...latestUpdate }
            : nextState);
        }
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ");
      }
    };
    const onStateUpdate = (update: CommandAnnouncementRealtimeUpdate) => {
      latestRealtimeUpdate = update;
      if (isMounted) {
        setState((current) => current ? { ...current, ...update } : current);
      }
    };
    const onConnect = () => {
      if (hasConnected) void loadState();
      hasConnected = true;
    };

    socket.on("commandAnnouncements:stateUpdated", onStateUpdate);
    socket.on("connect", onConnect);
    void loadState();
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      isMounted = false;
      socket.off("commandAnnouncements:stateUpdated", onStateUpdate);
      socket.off("connect", onConnect);
      window.clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (countdownPhase !== "running" || !countdownStartedAt) return;

    let isMounted = true;
    let timeoutId: number;
    const scheduleRefresh = (delayMs: number) => {
      timeoutId = window.setTimeout(() => void refreshState(), delayMs);
    };
    const refreshState = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isMounted) scheduleRefresh(2000);
          return;
        }

        const latestState = await apiFetch<CommandAnnouncementState>(API_PATH, { token });
        if (!isMounted) return;
        if (latestState.phase === "running") {
          scheduleRefresh(2000);
        } else {
          setState(latestState);
        }
      } catch {
        if (isMounted) scheduleRefresh(5000);
      }
    };

    const expiresAt = Date.parse(countdownStartedAt) + ANNOUNCEMENT_DURATION_SECONDS * 1000;
    scheduleRefresh(Math.max(0, expiresAt - Date.now() + 1000));

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [countdownPhase, countdownStartedAt]);

  useEffect(() => {
    if (!isConfigOpen && !isResetConfirmOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsConfigOpen(false);
        setIsResetConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isConfigOpen, isResetConfirmOpen]);

  const startCountdown = async () => {
    setIsActing(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const nextState = await apiFetch<CommandAnnouncementState>(`${API_PATH}/start`, {
        method: "POST",
        token,
        body: JSON.stringify({ delaySeconds: selectedDelay }),
      });
      setState(nextState);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "เริ่มประกาศไม่สำเร็จ");
    } finally {
      setIsActing(false);
    }
  };

  const resetCountdown = async () => {
    setIsActing(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const nextState = await apiFetch<CommandAnnouncementState>(`${API_PATH}/reset`, {
        method: "POST",
        token,
      });
      setState(nextState);
      setIsResetConfirmOpen(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "รีเซ็ตไม่สำเร็จ");
    } finally {
      setIsActing(false);
    }
  };

  const saveMessages = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const messages = buildCommandAnnouncementMessages(draftMessages);
      const token = await getAccessToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const nextState = await apiFetch<CommandAnnouncementState>(`${API_PATH}/messages`, {
        method: "PUT",
        token,
        body: JSON.stringify(messages),
      });
      setState(nextState);
      setIsConfigOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกข้อความไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  };

  const openConfig = async () => {
    setIsLoadingConfig(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const latestState = await apiFetch<CommandAnnouncementState>(API_PATH, { token });
      setState(latestState);
      setDraftMessages(
        Object.entries(latestState.messages)
          .map(([seconds, message]) => ({ id: crypto.randomUUID(), seconds, msg: message.msg }))
          .sort((left, right) => Number(right.seconds) - Number(left.seconds)),
      );
      setEditingTime(null);
      setNewTimeSeconds("");
      setMinutesToConvert("1");
      setConversionMessage(null);
      setIsConfigOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อความไม่สำเร็จ");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const addMessage = (seconds: number) => {
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > ANNOUNCEMENT_DURATION_SECONDS) {
      setError("เวลาแจ้งเตือนต้องอยู่ระหว่าง 1 ถึง 1,800 วินาที");
      return;
    }
    if (draftMessages.some((draft) => Number(draft.seconds) === seconds)) {
      setError(`มีรายการเวลา ${seconds} วินาทีอยู่แล้ว`);
      return;
    }

    const id = crypto.randomUUID();
    setDraftMessages((current) => [
      ...current,
      { id, seconds: String(seconds), msg: "" },
    ].sort((left, right) => Number(right.seconds) - Number(left.seconds)));
    setEditingTime({ id, seconds: String(seconds) });
    setError(null);
  };

  const saveEditedTime = () => {
    if (!editingTime) return;
    const seconds = Number(editingTime.seconds);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > ANNOUNCEMENT_DURATION_SECONDS) {
      setError("เวลาแจ้งเตือนต้องอยู่ระหว่าง 1 ถึง 1,800 วินาที");
      return;
    }
    if (draftMessages.some((draft) => draft.id !== editingTime.id && Number(draft.seconds) === seconds)) {
      setError(`มีรายการเวลา ${seconds} วินาทีอยู่แล้ว`);
      return;
    }

    setDraftMessages((current) => current
      .map((draft) => draft.id === editingTime.id ? { ...draft, seconds: String(seconds) } : draft)
      .sort((left, right) => Number(right.seconds) - Number(left.seconds)));
    setEditingTime(null);
    setError(null);
  };

  const addNewTime = () => {
    const seconds = Number(newTimeSeconds);
    addMessage(seconds);
    if (Number.isInteger(seconds) && seconds >= 1 && seconds <= ANNOUNCEMENT_DURATION_SECONDS) {
      setNewTimeSeconds("");
    }
  };

  const convertedSeconds = parseMinutesSeconds(minutesToConvert);
  const canUseConvertedSeconds = Number.isFinite(convertedSeconds)
    && convertedSeconds >= 1
    && convertedSeconds <= ANNOUNCEMENT_DURATION_SECONDS;

  const copyConvertedSeconds = async () => {
    if (!canUseConvertedSeconds) return;
    try {
      await navigator.clipboard.writeText(String(convertedSeconds));
      setConversionMessage(`คัดลอก ${convertedSeconds} วินาทีแล้ว`);
    } catch {
      setConversionMessage("คัดลอกไม่สำเร็จ");
    }
  };

  const timer = state ? getDisplayTime(state, now) : { label: "กำลังโหลด", time: "--:--" };
  const statusLabel = state?.phase === "waiting"
    ? "รอเริ่ม"
    : state?.phase === "running"
      ? "กำลังทำงาน"
      : state?.phase === "completed"
        ? "จบรอบแล้ว"
        : "หยุดอยู่";
  const isCountdownActive = state?.phase === "waiting" || state?.phase === "running";

  return (
    <section className="rounded-md border border-amber-100/10 bg-[#040a13]/90 p-5 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-100/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/80">Guild control</p>
          <h2 className="mt-1 text-xl font-bold text-white">Command announce</h2>
        </div>
        <div className="min-w-32 text-right">
          <p className="text-xs text-slate-400">{timer.label}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-amber-200">{timer.time}</p>
          <p className="text-xs text-slate-400">{statusLabel}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="เวลาเริ่มรอบ">
        {START_OPTIONS.map((option) => (
          <button
            key={option.seconds}
            type="button"
            aria-pressed={selectedDelay === option.seconds}
            onClick={() => setSelectedDelay(option.seconds)}
            disabled={isCountdownActive || isActing}
            className={`min-h-9 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${selectedDelay === option.seconds
              ? "border-amber-300 bg-amber-300 text-slate-950"
              : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-amber-200/60"
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-100/10 pt-4">
        <Button type="button" onClick={() => void startCountdown()} disabled={!state || isCountdownActive || isActing}>
          <Play size={15} aria-hidden="true" />
          Start
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsResetConfirmOpen(true)} disabled={!state || isActing}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void openConfig()}
          disabled={!state || isLoadingConfig}
        >
          <Settings2 size={15} aria-hidden="true" />
          Config msg
        </Button>
      </div>

      {isCountdownActive ? (
        <p className="mt-3 text-sm text-amber-200/80">มีรอบประกาศทำงานอยู่ กด Reset ก่อนเริ่มรอบใหม่</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p> : null}

      {isResetConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isActing) setIsResetConfirmOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="command-reset-title"
            aria-describedby="command-reset-description"
            className="w-full max-w-md rounded-md border border-rose-300/20 bg-[#07101c] p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-rose-300" size={20} aria-hidden="true" />
              <div>
                <h3 id="command-reset-title" className="text-lg font-semibold text-white">ยืนยันยกเลิกรอบ?</h3>
                <p id="command-reset-description" className="mt-2 text-sm leading-6 text-slate-300">
                  การนับถอยหลังและประกาศที่รออยู่จะถูกยกเลิก
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isActing}
              >
                กลับ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-rose-400/50 text-rose-200 hover:bg-rose-950/60"
                onClick={() => void resetCountdown()}
                disabled={isActing}
              >
                <RotateCcw size={15} aria-hidden="true" />
                {isActing ? "กำลังยกเลิก" : "ยืนยันยกเลิก"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isConfigOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsConfigOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-config-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md border border-amber-100/15 bg-[#07101c] shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-amber-100/10 px-4 py-3 sm:px-6">
              <div>
                <h3 id="command-config-title" className="text-lg font-semibold text-white">Config msg</h3>

              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setIsConfigOpen(false)}
                className="rounded p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="overflow-auto px-4 py-3 sm:px-6">
              <div className="grid gap-4 border-b border-slate-800 pb-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="minutes-to-seconds" className="mb-2 block text-xs font-medium text-slate-300">
                    แปลงนาที.วินาทีเป็นวินาที
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id="minutes-to-seconds"
                      type="text"
                      inputMode="decimal"
                      value={minutesToConvert}
                      onChange={(event) => {
                        setMinutesToConvert(event.target.value);
                        setConversionMessage(null);
                      }}
                      placeholder="เช่น 5.30"
                      className="h-10 w-24 rounded border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none focus:border-amber-300"
                    />
                    <output className="min-w-20 font-mono text-amber-200" aria-live="polite">
                      {canUseConvertedSeconds ? `${convertedSeconds} วินาที` : "-- วินาที"}
                    </output>
                    <button
                      type="button"
                      title="คัดลอกวินาที"
                      aria-label="คัดลอกวินาที"
                      onClick={() => void copyConvertedSeconds()}
                      disabled={!canUseConvertedSeconds}
                      className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-700 text-slate-200 hover:border-amber-300 disabled:opacity-40"
                    >
                      <Copy size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => canUseConvertedSeconds && addMessage(convertedSeconds)}
                      disabled={!canUseConvertedSeconds}
                      className="inline-flex h-9 items-center gap-1 rounded bg-amber-300 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
                    >
                      <Plus size={15} aria-hidden="true" />
                      เพิ่มเวลา
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">รูปแบบ นาที.วินาที เช่น 5.30 = 5 นาที 30 วินาที</p>
                  {conversionMessage ? <p className="mt-1 text-xs text-slate-400" aria-live="polite">{conversionMessage}</p> : null}
                </div>
                <div>
                  <label htmlFor="new-message-seconds" className="mb-2 block text-xs font-medium text-slate-300">
                    เพิ่มเวลาเป็นวินาที
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-message-seconds"
                      type="number"
                      min="1"
                      max={ANNOUNCEMENT_DURATION_SECONDS}
                      step="1"
                      value={newTimeSeconds}
                      onChange={(event) => setNewTimeSeconds(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addNewTime();
                      }}
                      placeholder="เช่น 60"
                      className="h-10 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none focus:border-amber-300"
                    />
                    <Button type="button" variant="outline" onClick={addNewTime}>
                      <Plus size={15} aria-hidden="true" />
                      เพิ่มรายการ
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                {draftMessages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีเวลาแจ้งเตือน</p>
                ) : draftMessages.map((draft) => (
                  <div
                    key={draft.id}
                    className="min-w-[44rem] gap-3 border-b border-slate-800/90 py-3"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                    }}
                  >
                    <div style={{ gridColumn: "span 3 / span 3" }}>
                      <div className="flex flex-col w-full flex-1 items-start" >

                        <span className="text-xs text-slate-400">เวลาเหลือ</span>
                        {editingTime?.id === draft.id ? (
                          <>
                            <div className="mt-1 flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max={ANNOUNCEMENT_DURATION_SECONDS}
                                step="1"
                                aria-label="เวลาเหลือเป็นวินาที"
                                value={editingTime.seconds}
                                onChange={(event) => setEditingTime({ id: draft.id, seconds: event.target.value })}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") saveEditedTime();
                                  if (event.key === "Escape") setEditingTime(null);
                                }}
                                className="h-10  flex-1 rounded border border-slate-700 bg-slate-950 px-3 font-mono text-amber-200 outline-none focus:border-amber-300"
                              />
                              <button
                                type="button"
                                title="บันทึกเวลา"
                                aria-label="บันทึกเวลา"
                                onClick={saveEditedTime}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                              >
                                <Check size={15} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                title="ยกเลิกแก้ไขเวลา"
                                aria-label="ยกเลิกแก้ไขเวลา"
                                onClick={() => setEditingTime(null)}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-700 text-slate-300 hover:bg-white/5"
                              >
                                <X size={15} aria-hidden="true" />
                              </button>
                            </div>
                            <span className="mt-1 block text-xs text-slate-400" aria-live="polite">
                              {formatDurationLabel(editingTime.seconds)}
                            </span>
                          </>
                        ) : (
                          <div className="mt-1 flex min-h-10 items-center justify-between gap-2 rounded border border-slate-700 bg-slate-950 px-3">
                            <span className="text-sm text-amber-200">{formatDurationLabel(draft.seconds)}</span>
                            <button
                              type="button"
                              title="แก้ไขเวลา"
                              aria-label={`แก้ไขเวลา ${draft.seconds} วินาที`}
                              onClick={() => setEditingTime({ id: draft.id, seconds: draft.seconds })}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-white/10 hover:text-amber-200"
                            >
                              <Pencil size={14} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="text-xs text-slate-400 flex flex-col items-start" style={{ gridColumn: "span 8 / span 8" }}>
                      <span className="text-xs text-slate-400">ข้อความประกาศ</span>
                      <textarea
                        aria-label={`ข้อความเมื่อเหลือ ${draft.seconds} วินาที`}
                        rows={2}
                        maxLength={2000}
                        value={draft.msg}
                        onChange={(event) => setDraftMessages((current) => current.map((item) => (
                          item.id === draft.id ? { ...item, msg: event.target.value } : item
                        )))}
                        className="mt-1 w-full h-[40px] w-full resize-y rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300"
                      />
                    </label>
                    <div style={{ gridColumn: "span 1 / span 1" }} className="flex justify-end items-center">
                      <button
                        type="button"
                        title="ลบเวลาแจ้งเตือน"
                        aria-label={`ลบเวลา ${draft.seconds} วินาที`}
                        onClick={() => {
                          setDraftMessages((current) => current.filter((item) => item.id !== draft.id));
                          if (editingTime?.id === draft.id) setEditingTime(null);
                        }}
                        className="mt-5 inline-flex h-9 w-9 items-center justify-center justify-self-end rounded border border-rose-500/30 text-rose-300 hover:bg-rose-950/40"

                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-amber-100/10 px-4 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)} disabled={isSaving}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={() => void saveMessages()} disabled={isSaving}>
                <Save size={15} aria-hidden="true" />
                {isSaving ? "กำลังบันทึก" : "บันทึก"}
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}