"use client";

import { useState } from "react";
import { LockIcon } from "../icons";
import { site } from "@/data/site";
import { checkPassword } from "@/data/access";

export function ProjectWindow({
  message,
  title,
  locked = false,
  onUnlock,
}: {
  message: string;
  // the project's name, used on the password screen
  title?: string;
  // true while the project still needs a password
  locked?: boolean;
  onUnlock?: () => void;
}) {
  if (locked) return <LockScreen title={title} onUnlock={() => onUnlock?.()} />;
  return (
    // plain white content, like about.txt; the window itself is the tall shape
    <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#666]">
      <p>{message}</p>
    </div>
  );
}

// What a protected project shows until it's unlocked: a padlock and a password field.
function LockScreen({ title, onUnlock }: { title?: string; onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  // bumping this re-triggers the shake on a repeated wrong guess
  const [tries, setTries] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    const ok = await checkPassword(value);
    setChecking(false);
    if (ok) {
      onUnlock();
    } else {
      setWrong(true);
      setTries((n) => n + 1);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-8 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f3f2] text-[#6f6f6f]">
        <LockIcon className="h-[22px] w-[19px]" />
      </span>
      <h1 className="mt-4 max-w-[320px] text-[17px] font-semibold leading-snug text-[#111]">
        {title ? `${title} is password protected` : "This project is password protected"}
      </h1>
      <form onSubmit={submit} className="mt-5 flex w-full max-w-[260px] flex-col gap-2.5">
        <input
          key={tries}
          type="password"
          value={value}
          autoFocus
          autoComplete="off"
          placeholder="Password"
          aria-label="Password"
          aria-invalid={wrong || undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
          }}
          className={`aqua-field w-full select-text px-2.5 py-1.5 text-center text-[16px] text-black outline-none placeholder:text-black/35 focus:border-[#4d90fe] focus:ring-[3px] focus:ring-[#4d90fe]/40 sm:text-[13px] ${
            wrong ? "shake" : ""
          }`}
          style={wrong ? { borderColor: "#d9534f" } : undefined}
        />
        {wrong && (
          <p role="alert" className="field-error text-[12px] leading-snug text-[#b5382d]">
            Incorrect password
          </p>
        )}
        <button
          type="submit"
          disabled={checking}
          className="aqua-button self-center px-5 py-1.5 text-[13px] font-semibold disabled:cursor-wait disabled:opacity-60"
        >
          Unlock
        </button>
      </form>
      <p className="mt-7 text-[12px] text-[#8c8c8c]">
        Need access?{" "}
        <a href={`mailto:${site.email}`} className="underline hover:text-[#111]">
          Email me
        </a>
      </p>
    </div>
  );
}
