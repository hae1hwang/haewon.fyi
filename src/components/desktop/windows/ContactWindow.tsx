"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "@formspree/react";
import { site } from "@/data/site";

// same look as the "Download resume" link in about.txt: grey like the text,
// underlined, light blue highlight and darker text on hover
const linkClass =
  "-mx-0.5 rounded-[3px] px-0.5 underline [box-decoration-break:clone] hover:bg-[#d9ebff] hover:text-[#101010]";

// 16px on phones: iOS zooms the page in whenever a text field smaller than that
// gets focus, and doesn't always zoom back out afterwards
const fieldClass =
  "aqua-field w-full select-text px-2.5 py-1.5 text-[16px] text-black outline-none sm:text-[13px] placeholder:text-black/35 focus:border-[#4d90fe] focus:ring-[3px] focus:ring-[#4d90fe]/40";

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

// friendly wording for form problems, instead of the raw browser / Formspree text
const MSG = {
  emailMissing: "Please add your email",
  emailInvalid: "That email address doesn't look quite right",
  messageMissing: "Please write a message",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldName = "email" | "message";

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-px h-[13px] w-[13px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.4" />
      <path d="M8 4.7v3.7" />
      <circle cx="8" cy="11.2" r=".55" fill="currentColor" />
    </svg>
  );
}

// small message under a field
function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="field-error -mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-[#b5382d]"
    >
      <ErrorIcon />
      <span>{children}</span>
    </p>
  );
}

// red outline for an invalid field (inline, since .aqua-field sets its own border and shadow)
const invalidStyle: React.CSSProperties = {
  borderColor: "#d6574b",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.12), 0 0 0 3px rgba(214,87,75,0.2)",
};

export function ContactWindow() {
  const [state, handleSubmit, reset] = useForm(site.formspreeId);
  // problems found in the browser before anything is sent
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  // once a field is edited, Formspree's message about it from the last send is stale
  const [edited, setEdited] = useState<Partial<Record<FieldName, boolean>>>({});

  function onEdit(field: FieldName) {
    setFieldErrors((f) => ({ ...f, [field]: undefined }));
    setEdited((d) => ({ ...d, [field]: true }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const found: Partial<Record<FieldName, string>> = {};
    if (!email) found.email = MSG.emailMissing;
    else if (!EMAIL_RE.test(email)) found.email = MSG.emailInvalid;
    if (!message) found.message = MSG.messageMissing;

    const first = (Object.keys(found) as FieldName[])[0];
    if (first) {
      e.preventDefault();
      setFieldErrors(found);
      // nudge each bad field, and put the cursor in the first one
      for (const name of Object.keys(found)) {
        const el = form.elements.namedItem(name) as HTMLElement | null;
        el?.classList.remove("shake");
        void el?.offsetWidth; // restart the animation if it just ran
        el?.classList.add("shake");
      }
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setFieldErrors({});
    setEdited({});
    return handleSubmit(e);
  }

  // Formspree's own complaints, in friendly words
  const serverField = (field: FieldName) => {
    const first = state.errors?.getFieldErrors(field)[0];
    if (!first || edited[field]) return undefined;
    if (field === "message") return MSG.messageMissing;
    return first.code === "TYPE_EMAIL" ? MSG.emailInvalid : MSG.emailMissing;
  };
  const emailError = fieldErrors.email ?? serverField("email");
  const messageError = fieldErrors.message ?? serverField("message");
  // hidden again while a retry is in flight
  const sendFailed = !state.submitting && (state.errors?.getFormErrors().length ?? 0) > 0;
  // `n` counts copies; it keys the animated pieces so every click replays them
  const [copy, setCopy] = useState<{
    status: "copied" | "failed" | null;
    n: number;
    leaving: boolean; // the label is playing its exit animation
  }>({ status: null, n: 0, leaving: false });
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const copyStatus = copy.status;
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(copyTimer.current);
      clearTimeout(leaveTimer.current);
    },
    []
  );

  // Keeps the label just under the copy icon, wherever the icon is *now*: on a
  // phone, tapping the icon dismisses the keyboard and the window slides back
  // to the centre, so a position read at tap time would be stale.
  useLayoutEffect(() => {
    if (!copy.status) return;
    const place = () => {
      const btn = copyBtnRef.current;
      const tip = tipRef.current;
      if (!btn || !tip) return;
      const r = btn.getBoundingClientRect();
      tip.style.left = `${r.left + r.width / 2}px`;
      tip.style.top = `${r.bottom + 6}px`;
    };
    place();
    const id = setInterval(place, 16);
    return () => clearInterval(id);
  }, [copy.status, copy.n]);

  async function copyEmail() {
    const ok = await copyText(site.email);
    setCopy((c) => ({ status: ok ? "copied" : "failed", n: c.n + 1, leaving: false }));
    clearTimeout(copyTimer.current);
    clearTimeout(leaveTimer.current);
    // after two seconds the label plays its exit animation, then everything resets
    copyTimer.current = setTimeout(() => {
      setCopy((c) => ({ ...c, leaving: true }));
      leaveTimer.current = setTimeout(
        () => setCopy((c) => ({ ...c, status: null, leaving: false })),
        300
      );
    }, 2000);
  }
  const linkedin = site.socials.find((s) => s.label === "LinkedIn");

  return (
    <div className="bg-white p-5 text-[13px] text-[#1a1a1a]">
      {/* drawn on the page itself, not inside the window, so it can hang past
          the window's edge without being clipped */}
      {copyStatus &&
        createPortal(
          <span
            key={`tip-${copy.n}`}
            ref={tipRef}
            className={`copy-tip ${copy.leaving ? "copy-tip-out" : ""} pointer-events-none fixed z-[70] -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2b2b2b] px-2 py-1 text-[11px] leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]`}
          >
            {copyStatus === "copied" ? "Email copied to clipboard" : "Couldn't copy"}
          </span>,
          document.body
        )}
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
          noValidate
          onSubmit={onSubmit}
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
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "contact-email-error" : undefined}
              style={emailError ? invalidStyle : undefined}
              onChange={() => onEdit("email")}
            />
          </label>
          {emailError && <FieldError id="contact-email-error">{emailError}</FieldError>}

          <label className="flex flex-col gap-1 text-[13px] leading-relaxed text-[#666]">
            Message
            <textarea
              name="message"
              required
              rows={5}
              placeholder="Say hello…"
              className={`${fieldClass} resize-none`}
              aria-invalid={messageError ? true : undefined}
              aria-describedby={messageError ? "contact-message-error" : undefined}
              style={messageError ? invalidStyle : undefined}
              onChange={() => onEdit("message")}
            />
          </label>
          {messageError && <FieldError id="contact-message-error">{messageError}</FieldError>}

          {/* honeypot: hidden from people, filled in by spam bots */}
          <input
            type="text"
            name="_gotcha"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />

          {sendFailed && (
            <div
              role="alert"
              className="field-error flex items-start gap-2 rounded-[6px] border border-[#efc3bd] bg-[#fdf1ef] px-3 py-2 text-[12px] leading-snug text-[#8f2f26]"
            >
              <ErrorIcon />
              <span>
                That didn&apos;t send. Please try again, or email me at{" "}
                <a href={`mailto:${site.email}`} className="underline">
                  {site.email}
                </a>
                .
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[13px] leading-relaxed text-[#666]">
              <span className="sr-only" role="status">
                {copyStatus === "copied" ? "Email address copied to clipboard" : ""}
              </span>
              {/* "Or <address> <copy icon>" is one unbroken unit: when the line has to
                  wrap, it wraps after the icon, never between the address and the icon */}
              <span className="whitespace-nowrap">
              Or{" "}
              <a
                href={`mailto:${site.email}`}
                className={linkClass}
              >
                {site.email}
              </a>
              <button
                type="button"
                ref={copyBtnRef}
                onClick={copyEmail}
                aria-label="Copy email address"
                title="Copy email address"
                className="relative ml-1 inline-flex h-5 w-5 items-center justify-center rounded-[3px] align-middle hover:bg-[#d9ebff] hover:text-[#101010]"
              >
                {copyStatus && (
                  <span
                    key={`ring-${copy.n}`}
                    aria-hidden
                    className={`copy-ring ${copyStatus === "failed" ? "copy-ring-bad" : ""}`}
                  />
                )}
                {copyStatus === "copied" ? (
                  <svg key={`check-${copy.n}`} viewBox="0 0 24 24" className="copy-check h-[14px] w-[14px] text-[#2e9a4f]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
                  </svg>
                ) : copyStatus === "failed" ? (
                  <svg key={`cross-${copy.n}`} viewBox="0 0 24 24" className="copy-check h-[14px] w-[14px] text-[#d6453a]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6.5 6.5 17.5 17.5" pathLength={1} />
                    <path d="M17.5 6.5 6.5 17.5" pathLength={1} />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="2.5" />
                    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
                  </svg>
                )}
              </button>
              </span>
              {linkedin && (
                <>
                  {/* the dot separator is dropped on phones, where this wraps to its own line */}
                  <span className="max-sm:hidden">{" · "}</span>
                  <span className="sm:hidden">{" "}</span>
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
              aria-busy={state.submitting}
              className="aqua-button min-w-[90px] shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {state.submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
