"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LockIcon } from "../icons";
import { site } from "@/data/site";
import { checkPassword } from "@/data/access";
import { createPortal } from "react-dom";
import type { Block, CaseStudy, Figure } from "@/data/caseStudies";

// A project window reads like a document: plain white page, one column, simple
// type. Images are the only thing with a frame. Projects without a case study
// yet show a short message instead.
export function ProjectWindow({
  message,
  caseStudy,
  locked = false,
  onUnlock,
  title,
}: {
  message: string;
  caseStudy?: CaseStudy;
  // the project's name, used on the password screen
  title?: string;
  // true while the project still needs a password
  locked?: boolean;
  onUnlock?: () => void;
}) {
  if (locked) return <LockScreen title={title} onUnlock={() => onUnlock?.()} />;
  if (!caseStudy) {
    return (
      <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#666]">
        <p>{message}</p>
      </div>
    );
  }

  return <CaseStudyView caseStudy={caseStudy} />;
}

// The case study document. Its main headings are listed as "Chapters" in the facts table,
// and each one scrolls the window's body to that heading.
function CaseStudyView({ caseStudy }: { caseStudy: CaseStudy }) {
  const articleRef = useRef<HTMLElement>(null);
  // every heading and subheading on the page, by the index of its block
  const anchorEls = useRef<Record<number, HTMLElement | null>>({});
  // the page's outline: each main heading with the subheadings under it
  const chapters: { text: string; blockIndex: number; subs: { text: string; blockIndex: number }[] }[] = [];
  caseStudy.blocks.forEach((b, i) => {
    if (b.type === "heading") chapters.push({ text: b.text, blockIndex: i, subs: [] });
    else if (b.type === "subheading" && chapters.length > 0) chapters[chapters.length - 1].subs.push({ text: b.short ?? b.text, blockIndex: i });
  });

  function goTo(blockIndex: number) {
    const target = anchorEls.current[blockIndex];
    // the window's scrolling body (the page itself never scrolls)
    const scroller = articleRef.current?.closest(".overflow-y-auto");
    if (!target || !scroller) return;
    const top =
      target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 14;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }

  const linkClass =
    "-mx-0.5 rounded-[3px] px-0.5 text-left underline decoration-[#b9b9b9] underline-offset-2 hover:bg-[#d9ebff] hover:decoration-[#333]";

  return (
    <article
      ref={articleRef}
      className="min-h-full bg-white px-6 pb-14 pt-7 text-[13.5px] leading-[1.65] text-[#444] sm:px-9"
    >
      <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#111]">
        {caseStudy.title}
      </h1>
      <p className="mt-2 text-[#555]">{caseStudy.summary}</p>

      <dl className="mt-5 grid grid-cols-[88px_1fr] gap-x-4 gap-y-1.5 border-y border-[#e6e6e6] py-3 text-[12.5px] leading-snug">
        {caseStudy.facts.map((f) => (
          <div key={f.label} className="contents">
            <dt className="text-[#8c8c8c]">{f.label}</dt>
            <dd className="text-[#333]">{f.value}</dd>
          </div>
        ))}
        {chapters.length > 0 && (
          <div className="contents">
            <dt className="text-[#8c8c8c]">Chapters</dt>
            <dd className="text-[#333]">
              <ul className="space-y-0.5">
                {chapters.map((c) => (
                  <li key={c.blockIndex}>
                    <button type="button" onClick={() => goTo(c.blockIndex)} className={linkClass}>
                      {c.text}
                    </button>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-2">
        {caseStudy.blocks.map((block, i) => {
          // a main heading is followed by its subheadings, in one line divided by bars
          const subs = block.type === "heading" && !block.noSubLinks ? (chapters.find((c) => c.blockIndex === i)?.subs ?? []) : [];
          return (
            <Fragment key={i}>
              <BlockView
                block={block}
                anchorRef={
                  block.type === "heading" || block.type === "subheading"
                    ? (el) => {
                        anchorEls.current[i] = el;
                      }
                    : undefined
                }
              />
              {subs.length > 0 && (
                <div className="-mt-1 mb-1 text-[12px] leading-snug text-[#6f6f6f]">
                  {subs.map((sub, k) => (
                    <Fragment key={sub.blockIndex}>
                      {k > 0 && <span className="mx-1.5 text-[#c4c4c4]">|</span>}
                      <button type="button" onClick={() => goTo(sub.blockIndex)} className={linkClass}>
                        {sub.text}
                      </button>
                    </Fragment>
                  ))}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </article>
  );
}

// Light text styling inside case study copy: **bold**, *italic* (or _italic_) and
// ***bold italic***.
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return (
        <strong key={i} className="font-semibold text-[#222]">
          <em>{part.slice(3, -3)}</em>
        </strong>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[#222]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// Text with line breaks: "\n" starts a new line, "\n~" starts one after a small paragraph gap (more
// than the space between two paragraphs, less than a blank line), and two "\n" in a row leave a
// blank line. Bold and italic marks (**, *, _) work inside.
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.startsWith("~") ? (
          <span key={i} className="mt-4 block">
            {inline(line.slice(1).trimStart())}
          </span>
        ) : (
          <span key={i} className="block">
            {line ? inline(line) : "\u00a0"}
          </span>
        )
      )}
    </>
  );
}

function BlockView({
  block,
  anchorRef,
}: {
  block: Block;
  // set on headings and subheadings so the Chapters list can scroll to them
  anchorRef?: (el: HTMLHeadingElement | null) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <h2 ref={anchorRef} className="mb-2 mt-9 text-[15px] font-semibold leading-snug text-[#111]">
          {block.text}
        </h2>
      );
    case "subheading":
      return (
        <h3 ref={anchorRef} className="mb-1.5 mt-6 text-[13.5px] font-semibold leading-snug text-[#222]">
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p className="mt-3">
          <Lines text={block.text} />
        </p>
      );
    case "code":
      return (
        <p className="code-quoted mt-4 rounded-[6px] bg-[#f3f3f2] px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-[#333]">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-[#b5b5b5]">
          {block.items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ul>
      );
    case "terms":
      return (
        <dl className="mt-3 space-y-2.5">
          {block.items.map((t) => (
            <div key={t.term}>
              <dt className="font-semibold text-[#222]">{t.term}</dt>
              {/* a list of texts gives one paragraph each, with a gap between them */}
              {(Array.isArray(t.text) ? t.text : [t.text]).map((para, i) => (
                <dd key={i} className={i > 0 ? "mt-2.5" : ""}>
                  <Lines text={para} />
                </dd>
              ))}
            </div>
          ))}
        </dl>
      );
    case "stats":
      return (
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
          {block.items.map((s) => (
            <div key={s.label}>
              <div className="text-[24px] font-semibold leading-none tracking-[-0.01em] text-[#111]">
                {s.value}
              </div>
              <div className="mt-1.5 text-[12px] text-[#8c8c8c]">{s.label}</div>
            </div>
          ))}
        </div>
      );
    case "figure":
      return (
        <div className={`mt-4 ${block.narrow ? "max-w-[280px]" : ""}`}>
          <FigureView figure={block.figure} />
        </div>
      );
    case "split":
      return <SplitRow left={block.left} right={block.right} />;
    case "devices":
      return (
        <div className="mt-5">
          <Devices laptop={block.laptop} phone={block.phone} />
        </div>
      );
    case "figures":
      return (
        // each image takes a share of the row in proportion to its shape, so
        // side-by-side images line up at the same height
        <div className="mt-4 flex items-start gap-3">
          {block.figures.map((f) => (
            <div key={f.src} className="min-w-0" style={{ flex: f.width / f.height }}>
              <FigureView figure={f} />
            </div>
          ))}
        </div>
      );
  }
}

function FigureView({ figure }: { figure: Figure }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized images */}
      <img
        src={figure.src}
        width={figure.width}
        height={figure.height}
        alt={figure.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-auto w-full rounded-[4px] border border-[#e3e3e3]"
      />
      {figure.caption && (
        <figcaption className="mt-1.5 text-[11.5px] leading-snug text-[#8c8c8c]">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}

// How big the enlarged preview can get, and how far it keeps from the screen edges
const PREVIEW_MAX_WIDTH = 900;
const PREVIEW_MIN_WIDTH = 360;
const PREVIEW_EDGE = 20;
const PREVIEW_GAP = 12;
// the preview must be at least this much wider than the window, or it isn't shown
const PREVIEW_MIN_GAIN = 1.1;
// the devices' width in the page, and how wide each is inside it (the laptop is 88%, the phone 21%);
// an enlarged copy scales a device's bezel up from its in-page width
const DEVICES_WIDTH = 600;
const LAPTOP_SHARE = 0.88;
const PHONE_SHARE = 0.21;
// how tall each device is compared with its width (laptop: screen 16:10 plus bezel and base;
// phone: the GIF's 300 x 649 plus bezel)
const LAPTOP_ASPECT = 0.686;
const PHONE_ASPECT = 2.09;

type Kind = "laptop" | "phone";
type Preview = { kind: Kind; left: number; top: number; width: number };

// Both animated GIFs should start together so their scrolling stays in tandem. Each one
// is loaded first; only when both have arrived are they put on screen in the same moment.
function useBothLoaded(enabled: boolean, ...srcs: string[]) {
  const [ready, setReady] = useState(false);
  const key = srcs.join("|");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all(
      srcs.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = src;
          })
      )
    ).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return ready;
}

// A screen's picture: the image once it's ready to play, otherwise a blank of the same shape
function Screen({ figure, ready, radius }: { figure: Figure; ready: boolean; radius: number }) {
  return ready ? (
    // eslint-disable-next-line @next/next/no-img-element -- animated GIF, pre-sized
    <img
      src={figure.src}
      width={figure.width}
      height={figure.height}
      alt={figure.alt}
      decoding="async"
      draggable={false}
      className="block h-auto w-full bg-white"
      style={{ borderRadius: radius }}
    />
  ) : (
    <div
      role="img"
      aria-label={figure.alt}
      className="w-full bg-white"
      style={{ aspectRatio: `${figure.width} / ${figure.height}`, borderRadius: radius }}
    />
  );
}

// A plain laptop: dark bezel around the screen, a camera dot, and a thin base.
// `scale` thickens the bezel and base when the laptop is drawn larger.
function LaptopFrame({ figure, ready, scale }: { figure: Figure; ready: boolean; scale: number }) {
  return (
    <div className="w-full">
      <div
        className="relative bg-[#1c1c1e]"
        style={{
          borderRadius: `${11 * scale}px ${11 * scale}px 0 0`,
          padding: `${14 * scale}px ${7 * scale}px ${8 * scale}px`,
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#3a3a3d]"
          style={{ top: 5 * scale, width: 4 * scale, height: 4 * scale }}
        />
        <Screen figure={figure} ready={ready} radius={2 * scale} />
      </div>
      <div
        className="relative -mx-[3.5%] bg-gradient-to-b from-[#dcdcde] to-[#b9b9bd] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        style={{ height: 10 * scale, borderRadius: `0 0 ${12 * scale}px ${12 * scale}px` }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 w-[18%] -translate-x-1/2 bg-[#a4a4a8]"
          style={{ height: 4 * scale, borderRadius: `0 0 ${6 * scale}px ${6 * scale}px` }}
        />
      </div>
    </div>
  );
}

// A plain phone: dark rounded body, a pill-shaped camera cutout, the screen filling the rest.
function PhoneFrame({ figure, ready, scale }: { figure: Figure; ready: boolean; scale: number }) {
  return (
    <div
      className="relative bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      style={{ borderRadius: 17 * scale, padding: 4 * scale }}
    >
      <Screen figure={figure} ready={ready} radius={13.5 * scale} />
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
        style={{ top: 9 * scale, width: "28%", height: 5.5 * scale }}
      />
    </div>
  );
}

// The devices in the page: the laptop with the phone standing in front of its lower left
// corner (bottom edges lined up), like a product shot. On a mouse device, hovering either one
// opens an enlarged copy of just that device, next to the window or, when there's no room
// beside it, over the window itself. The copy has to be clearly bigger than the window (by
// width for the laptop, by height for the phone), otherwise there's nothing to gain and the
// hover does nothing. Touch devices have no hover, so they just see the small ones.
// (the phone is optional: some versions are shown on the laptop alone)
function Devices({ laptop, phone }: { laptop: Figure; phone?: Figure }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  // whether each device has room for an enlarged copy (decides the zoom cursor)
  const [zoomable, setZoomable] = useState<Record<Kind, boolean>>({ laptop: true, phone: true });
  // the GIFs are a few MB each, so they only start loading as the devices near the screen
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const ready = useBothLoaded(near, laptop.src, ...(phone ? [phone.src] : []));

  function show(kind: Kind, el: HTMLElement) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const win = (rootRef.current?.closest(".aqua-window") ?? el).getBoundingClientRect();
    const mine = el.getBoundingClientRect();
    const aspect = kind === "laptop" ? LAPTOP_ASPECT : PHONE_ASPECT;
    // the largest this device can be: its own cap, and short enough for the screen
    const cap = Math.min(kind === "laptop" ? PREVIEW_MAX_WIDTH : 520, (vh - PREVIEW_EDGE * 2) / aspect);
    const minSide = kind === "laptop" ? PREVIEW_MIN_WIDTH : 240;
    // "clearly bigger than the window": the laptop by width, the phone by height
    const bigEnough = (w: number) =>
      kind === "laptop" ? w >= win.width * PREVIEW_MIN_GAIN : w * aspect >= win.height * PREVIEW_MIN_GAIN;

    const spaceRight = vw - win.right - PREVIEW_GAP - PREVIEW_EDGE;
    const spaceLeft = win.left - PREVIEW_GAP - PREVIEW_EDGE;
    const widthRight = Math.min(cap, spaceRight);
    const widthLeft = Math.min(cap, spaceLeft);
    let width: number;
    let left: number;
    if (spaceRight >= minSide && bigEnough(widthRight)) {
      width = widthRight;
      left = win.right + PREVIEW_GAP;
    } else if (spaceLeft >= minSide && bigEnough(widthLeft)) {
      width = widthLeft;
      left = win.left - PREVIEW_GAP - width;
    } else {
      // no room beside the window (e.g. it sits in the middle): enlarge over the window itself
      width = Math.min(cap, vw - PREVIEW_EDGE * 2);
      left = Math.min(
        Math.max(win.left + win.width / 2 - width / 2, PREVIEW_EDGE),
        vw - PREVIEW_EDGE - width
      );
    }
    if (!bigEnough(width)) {
      setZoomable((z) => ({ ...z, [kind]: false }));
      return;
    }
    setZoomable((z) => ({ ...z, [kind]: true }));
    const height = width * aspect;
    const centre = mine.top + mine.height / 2;
    const top = Math.min(
      Math.max(centre - height / 2, PREVIEW_EDGE),
      Math.max(PREVIEW_EDGE, vh - PREVIEW_EDGE - height)
    );
    setPreview({ kind, left, top, width });
  }

  return (
    <div ref={rootRef} className="relative mx-auto w-full" style={{ maxWidth: DEVICES_WIDTH }}>
      <div
        onMouseEnter={(e) => show("laptop", e.currentTarget)}
        onMouseLeave={() => setPreview(null)}
        className={zoomable.laptop ? "cursor-zoom-in" : ""}
        style={{
          // with a phone in front the laptop sits to the right; on its own it is centred
          marginLeft: `${((1 - LAPTOP_SHARE) / (phone ? 1 : 2)) * 100}%`,
          width: `${LAPTOP_SHARE * 100}%`,
        }}
      >
        <LaptopFrame figure={laptop} ready={ready} scale={1} />
      </div>
      {phone && (
        <div
          onMouseEnter={(e) => show("phone", e.currentTarget)}
          onMouseLeave={() => setPreview(null)}
          className={`absolute bottom-0 left-0 ${zoomable.phone ? "cursor-zoom-in" : ""}`}
          style={{ width: `${PHONE_SHARE * 100}%` }}
        >
          <PhoneFrame figure={phone} ready={ready} scale={1} />
        </div>
      )}
      {preview &&
        createPortal(
          <div
            aria-hidden
            className="hover-preview pointer-events-none fixed z-[9500]"
            style={{ left: preview.left, top: preview.top, width: preview.width }}
          >
            {preview.kind === "laptop" || !phone ? (
              <LaptopFrame
                figure={laptop}
                ready={ready}
                scale={Math.max(1, preview.width / (DEVICES_WIDTH * LAPTOP_SHARE))}
              />
            ) : (
              <PhoneFrame
                figure={phone}
                ready={ready}
                scale={Math.max(1, preview.width / (DEVICES_WIDTH * PHONE_SHARE))}
              />
            )}
          </div>,
          document.body
        )}
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

// Spacing used to line the picture up with the text beside it (all in px except the margin share):
// the empty space above the first line's letters, the same amount in total above and below, and
// the share of the tree picture's height that is empty margin (16px of 870px).
const SPLIT_TEXT_TOP = 6;
const SPLIT_TEXT_INSET = 12.5;
const SPLIT_IMAGE_MARGIN = 16 / 870;

// Text on the left, an image on the right. The image is sized so its height matches the
// height of the text beside it (it gets wider or narrower until the two line up). When the
// window is too narrow for two columns, the image drops below the text instead.
function SplitRow({ left, right }: { left: Block[]; right: Figure }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const aspect = right.height / right.width;

  useLayoutEffect(() => {
    function fit() {
      const row = rowRef.current;
      const l = leftRef.current;
      const r = rightRef.current;
      if (!row || !l || !r) return;
      // stacked (narrow window): the image just takes its own width
      if (getComputedStyle(row).flexDirection === "column") {
        r.style.width = "";
        r.style.marginTop = "";
        return;
      }
      // The text box has a little empty space above its first line and below its last, so the
      // visible text is shorter than the box. Line the drawing up with the visible text: its own
      // empty margin is left out, and it starts level with the top of the first line.
      const margin = SPLIT_IMAGE_MARGIN; // the share of the picture's height that is empty margin
      const toWidth = (textBox: number) => Math.max(0, textBox - SPLIT_TEXT_INSET) / (1 - 2 * margin) / aspect;
      // a wider image makes the text column narrower and so taller, which in turn asks for
      // a wider image: step towards the point where the two heights agree
      const widest = row.clientWidth * 0.5;
      let w = 150;
      for (let i = 0; i < 14; i++) {
        r.style.width = `${w}px`;
        const next = Math.min(widest, Math.max(120, toWidth(l.offsetHeight)));
        if (Math.abs(next - w) < 1) break;
        w = next;
      }
      r.style.width = `${w}px`;
      r.style.marginTop = `${SPLIT_TEXT_TOP - margin * w * aspect}px`;
    }
    fit();
    let lastWidth = rowRef.current?.clientWidth ?? 0;
    const observer = new ResizeObserver(() => {
      const width = rowRef.current?.clientWidth ?? 0;
      if (width !== lastWidth) {
        lastWidth = width;
        fit();
      }
    });
    if (rowRef.current) observer.observe(rowRef.current);
    // text can reflow once fonts arrive
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [aspect]);

  return (
    <div className="@container">
      <div
        ref={rowRef}
        className="mt-3 flex flex-col gap-4 @[380px]:flex-row @[380px]:items-start @[380px]:gap-5"
      >
        <div ref={leftRef} className="min-w-0 flex-1 [&>:first-child]:!mt-0">
          {left.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>
        <div ref={rightRef} className="max-w-[280px] shrink-0">
          <ZoomFigure figure={right} />
        </div>
      </div>
    </div>
  );
}

// An image that, on a mouse device, opens an enlarged copy next to the window when hovered
// (or over the window, if there's no room beside it), like the laptop and phone mockups.
// It must come out clearly bigger than the image is on the page, or nothing happens.
function ZoomFigure({ figure }: { figure: Figure }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ left: number; top: number; width: number } | null>(null);
  const [zoomable, setZoomable] = useState(true);

  function show() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const win = (el.closest(".aqua-window") ?? el).getBoundingClientRect();
    const mine = el.getBoundingClientRect();
    const aspect = figure.height / figure.width;
    // the enlarged copy sits on a white card with 12px of padding all round
    const pad = 24;
    const cap = Math.min(PREVIEW_MAX_WIDTH, (vh - PREVIEW_EDGE * 2 - pad) / aspect + pad);
    const bigEnough = (w: number) => w >= mine.width * 1.5;
    const minSide = 240;

    const spaceRight = vw - win.right - PREVIEW_GAP - PREVIEW_EDGE;
    const spaceLeft = win.left - PREVIEW_GAP - PREVIEW_EDGE;
    const widthRight = Math.min(cap, spaceRight);
    const widthLeft = Math.min(cap, spaceLeft);
    let width: number;
    let left: number;
    if (spaceRight >= minSide && bigEnough(widthRight)) {
      width = widthRight;
      left = win.right + PREVIEW_GAP;
    } else if (spaceLeft >= minSide && bigEnough(widthLeft)) {
      width = widthLeft;
      left = win.left - PREVIEW_GAP - width;
    } else {
      width = Math.min(cap, vw - PREVIEW_EDGE * 2);
      left = Math.min(
        Math.max(win.left + win.width / 2 - width / 2, PREVIEW_EDGE),
        vw - PREVIEW_EDGE - width
      );
    }
    if (!bigEnough(width)) {
      setZoomable(false);
      return;
    }
    setZoomable(true);
    const height = (width - pad) * aspect + pad;
    const centre = mine.top + mine.height / 2;
    const top = Math.min(
      Math.max(centre - height / 2, PREVIEW_EDGE),
      Math.max(PREVIEW_EDGE, vh - PREVIEW_EDGE - height)
    );
    setPreview({ left, top, width });
  }

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setPreview(null)}
      className={zoomable ? "cursor-zoom-in" : ""}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized image */}
      <img
        src={figure.src}
        width={figure.width}
        height={figure.height}
        alt={figure.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-auto w-full"
      />
      {preview &&
        createPortal(
          <div
            aria-hidden
            className="hover-preview pointer-events-none fixed z-[9500]"
            style={{ left: preview.left, top: preview.top, width: preview.width }}
          >
            {/* the picture has no background of its own, so the enlarged copy sits on a white card */}
            <div className="rounded-[12px] bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized image */}
              <img src={figure.src} alt="" draggable={false} className="block h-auto w-full" />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
