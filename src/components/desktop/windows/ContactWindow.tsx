"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, ValidationError } from "@formspree/react";
import { site } from "@/data/site";

// same look as the "Download resume" link in about.txt: grey like the text,
// underlined, light blue highlight and darker text on hover
const linkClass =
  "-mx-0.5 rounded-[3px] px-0.5 underline [box-decoration-break:clone] hover:bg-[#d9ebff] hover:text-[#101010]";

const fieldClass =
  "aqua-field w-full select-text px-2.5 py-1.5 text-[13px] text-black outline-none placeholder:text-black/35 focus:border-[#4d90fe] focus:ring-[3px] focus:ring-[#4d90fe]/40";

// copies text to the clipboard; falls back to a hidden textarea where the
// async Clipboard API isn't available (older browsers, non-secure pages)
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

export function ContactWindow() {
  const [state, handleSubmit, reset] = useForm(site.formspreeId);
  // `n` counts copies; it keys the animated pieces so every click replays them
  const [copy, setCopy] = useState<{ status: "copied" | "failed" | null; n: number }>({
    status: null,
    n: 0,
  });
  const copyStatus = copy.status;
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyEmail() {
    const ok = await copyText(site.email);
    setCopy((c) => ({ status: ok ? "copied" : "failed", n: c.n + 1 }));
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopy((c) => ({ ...c, status: null })), 2000);
  }
  const linkedin = site.socials.find((s) => s.label === "LinkedIn");

  return (
    <div className="bg-white p-5 text-[13px] text-[#1a1a1a]">
      {state.succeeded ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p>Thanks — your message is on its way.</p>
          <button
            type="button"
            onClick={reset}
            className="aqua-button px-4 py-1 text-[12px] font-medium"
          >
            Send another
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          // with something typed, Esc just leaves the field instead of
          // closing the window and losing the message
          onKeyDown={(e) => {
            const field = e.target as HTMLInputElement | HTMLTextAreaElement;
            if (e.key === "Escape" && field.value) {
              e.stopPropagation();
              field.blur();
            }
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1 text-[13px] leading-relaxed text-[#666]">
            Your email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={fieldClass}
            />
          </label>
          <ValidationError
            field="email"
            errors={state.errors}
            className="-mt-2 text-[12px] text-red-600"
          />

          <label className="flex flex-col gap-1 text-[13px] leading-relaxed text-[#666]">
            Message
            <textarea
              name="message"
              required
              rows={5}
              placeholder="Say hello…"
              className={`${fieldClass} resize-none`}
            />
          </label>
          <ValidationError
            field="message"
            errors={state.errors}
            className="-mt-2 text-[12px] text-red-600"
          />

          {/* honeypot: hidden from people, filled in by spam bots */}
          <input
            type="text"
            name="_gotcha"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />

          <ValidationError errors={state.errors} className="text-[12px] text-red-600" />

          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[13px] leading-relaxed text-[#666]">
              <span className="sr-only" role="status">
                {copyStatus === "copied" ? "Email address copied to clipboard" : ""}
              </span>
              Or{" "}
              <a
                href={`mailto:${site.email}`}
                className={linkClass}
              >
                {site.email}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                aria-label="Copy email address"
                title="Copy email address"
                className="relative ml-1 inline-flex h-5 w-5 items-center justify-center rounded-[3px] align-middle hover:bg-[#d9ebff] hover:text-[#101010]"
              >
                {copyStatus === "copied" && (
                  <span key={`ring-${copy.n}`} aria-hidden className="copy-ring" />
                )}
                {copyStatus === "copied" ? (
                  <svg key={`check-${copy.n}`} viewBox="0 0 24 24" className="copy-check h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="2.5" />
                    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
                  </svg>
                )}
                {copyStatus && (
                  <span key={`tip-${copy.n}`} className="copy-tip pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2b2b2b] px-2 py-1 text-[11px] leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                    {copyStatus === "copied" ? "Email copied to clipboard" : "Couldn't copy"}
                  </span>
                )}
              </button>
              {linkedin && (
                <>
                  {" · "}
                  <a
                    href={linkedin.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    LinkedIn
                  </a>
                </>
              )}
            </p>
            <button
              type="submit"
              disabled={state.submitting}
              className="aqua-button shrink-0 px-5 py-1.5 text-[13px] font-semibold disabled:opacity-60"
            >
              {state.submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
