"use client";

import { useForm, ValidationError } from "@formspree/react";
import { site } from "@/data/site";

// same look as the "Download resume" link in about.txt: grey like the text,
// underlined, light blue highlight and darker text on hover
const linkClass =
  "-mx-0.5 rounded-[3px] px-0.5 underline [box-decoration-break:clone] hover:bg-[#d9ebff] hover:text-[#101010]";

const fieldClass =
  "aqua-field w-full select-text px-2.5 py-1.5 text-[13px] text-black outline-none placeholder:text-black/35 focus:border-[#4d90fe] focus:ring-[3px] focus:ring-[#4d90fe]/40";

export function ContactWindow() {
  const [state, handleSubmit, reset] = useForm(site.formspreeId);
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
              Or{" "}
              <a
                href={`mailto:${site.email}`}
                className={linkClass}
              >
                {site.email}
              </a>
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
