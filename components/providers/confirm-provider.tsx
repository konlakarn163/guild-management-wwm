"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CatFace } from "@/components/public/cat-decor";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    resolverRef.current?.(false);
    setOptions(typeof input === "string" ? { message: input } : input);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [options, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-md rounded-2xl border border-amber-100/10 bg-[#040a13] p-6 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <CatFace mood="warning" className="h-10 w-10 shrink-0" />
              <div>
                <h3 id="confirm-title" className="text-lg font-bold text-slate-100">
                  {options.title ?? "ยืนยันการทำรายการ"}
                </h3>
                <p id="confirm-message" className="mt-2 text-sm leading-6 text-slate-300/85">
                  {options.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {options.cancelLabel ?? "ยกเลิก"}
              </Button>
              <Button autoFocus className="bg-rose-500 text-white hover:bg-rose-400" onClick={() => close(true)}>
                {options.confirmLabel ?? "ยืนยัน"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return confirm;
}
