"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastMessage, "id">) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ─── Variants ────────────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />,
  error: <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
  info: <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />,
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((opts: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 pr-10 shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
              "data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-right-full",
              "transition-all duration-300",
              variantStyles[t.variant]
            )}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          >
            {variantIcons[t.variant]}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-semibold leading-snug">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-xs opacity-80 leading-relaxed">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="absolute right-2 top-2 rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const defaultToastContext: ToastContextValue = {
  toast: () => {},
};

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  return ctx || defaultToastContext;
}
