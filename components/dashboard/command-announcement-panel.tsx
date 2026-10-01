"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Play, RotateCcw, Save, Settings2, X } from "lucide-react";
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
const TIMES = [1560, 1500, 1260, 1200, 960, 900, 660, 600, 360, 300];
const START_OPTIONS = [
  { label: "เริ่มเลย", seconds: 0 },
  { label: "30 วินาที", seconds: 30 },
  { label: "1 นาที", seconds: 60 },
  { label: "2 นาที", seconds: 120 },
  { label: "3 นาที", seconds: 180 },
  { label: "4 นาที", seconds: 240 },
];

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getDisplayTime(state: CommandAnnouncementState, now: number): { label: string; time: string } {
  if (state.phase === "waiting" && state.scheduled_start_at) {
    const untilStart = Math.ceil((Date.parse(state.scheduled_start_at) - now) / 1000);
    if (untilStart > 0) return { label: "เริ่มรอบใน", time: formatTime(untilStart) };
    return { label: "เวลาที่เหลือ", time: formatTime(1800 - Math.floor((now - Date.parse(state.scheduled_start_at)) / 1000)) };
  }

  if (state.phase === "running" && state.started_at) {
    const elapsed = Math.floor((now - Date.parse(state.started_at)) / 1000);
    return { label: "เวลาที่เหลือ", time: formatTime(1800 - elapsed) };
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
  const [draftMessages, setDraftMessages] = useState<CommandAnnouncementMessages>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const token = await getAccessToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบอีกครั้ง");
      const nextState = await apiFetch<CommandAnnouncementState>(`${API_PATH}/messages`, {
        method: "PUT",
        token,
        body: JSON.stringify(draftMessages),
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
      setDraftMessages(latestState.messages);
      setIsConfigOpen(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อความไม่สำเร็จ");
    } finally {
      setIsLoadingConfig(false);
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
            className={`min-h-9 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              selectedDelay === option.seconds
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
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                    <th scope="col" className="w-32 px-2 py-2 font-medium">เหลือเวลา</th>
                    <th scope="col" className="px-2 py-2 font-medium">ข้อความประกาศ</th>
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map((secondsRemaining) => (
                    <tr key={secondsRemaining} className="border-b border-slate-800/90 align-top">
                      <th scope="row" className="whitespace-nowrap px-2 py-3 font-mono font-medium text-amber-200">
                        {formatTime(secondsRemaining)}
                      </th>
                      <td className="px-2 py-2">
                        <textarea
                          aria-label={`ข้อความเมื่อเหลือ ${formatTime(secondsRemaining)}`}
                          rows={2}
                          maxLength={2000}
                          value={draftMessages[String(secondsRemaining)]?.msg ?? ""}
                          onChange={(event) => setDraftMessages((current) => ({
                            ...current,
                            [String(secondsRemaining)]: { msg: event.target.value },
                          }))}
                          className="min-h-12 w-full resize-y rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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