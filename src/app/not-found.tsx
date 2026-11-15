import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#EAE7DF] dark:bg-[#0F1612] text-[#242B27] dark:text-[#E8EDE9]">
      <div className="glass-strong max-w-md w-full p-8 rounded-2xl text-center space-y-4 shadow-xl border border-black/10">
        <div className="w-12 h-12 rounded-2xl bg-[#DCE9DA] dark:bg-[#326B54]/40 text-[#326B54] dark:text-[#DCE9DA] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">404 — Dossier Not Found</h2>
        <p className="text-xs text-[#737A70] leading-relaxed">
          The requested intelligence view or report record does not exist in the active monitoring workspace.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#326B54] text-white text-xs font-semibold shadow hover:bg-[#294B39] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Command Center</span>
        </Link>
      </div>
    </div>
  );
}

