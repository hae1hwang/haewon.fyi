"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ExternalLinkIcon, LockIcon } from "../icons";
import { site } from "@/data/site";
import { getProtectedStudy, unlock } from "@/lib/vault";
import { createPortal } from "react-dom";
import type { Block, CaseStudy, Figure, TvOverlay, TvRemote, TvRemoteKey } from "@/data/caseStudies";

// A project window reads like a document: plain white page, one column, simple
// type. Images are the only thing with a frame. Projects without a case study
// yet show a short message instead.
export function ProjectWindow({
  message,
  caseStudy,
  protectedProject,
  locked = false,
  onUnlock,
  title,
}: {
  message: string;
  caseStudy?: CaseStudy;
  // a project whose case study is encrypted: it's fetched and opened once the page is unlocked
  protectedProject?: { folder: string; title: string };
  // the project's name, used on the password screen
  title?: string;
  // true while the project still needs a password
  locked?: boolean;
  onUnlock?: () => void;
}) {
  if (locked) return <LockScreen title={title} onUnlock={() => onUnlock?.()} />;
  if (protectedProject) return <ProtectedStudy project={protectedProject} message={message} />;
  if (!caseStudy) {
    return (
      <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#666]">
        <p>{message}</p>
      </div>
    );
  }

  return <CaseStudyView caseStudy={caseStudy} />;
}

// An encrypted case study: decrypted in the browser (images and all), so there's a moment of loading
function ProtectedStudy({ project, message }: { project: { folder: string; title: string }; message: string }) {
  const name = `${project.folder}/${project.title}`;
  const [result, setResult] = useState<{ name: string; study?: CaseStudy } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getProtectedStudy(project.folder, project.title)
      .then((study) => !cancelled && setResult({ name, study }))
      .catch(() => !cancelled && setResult({ name }));
    return () => {
      cancelled = true;
    };
  }, [name, project.folder, project.title]);
  const current = result?.name === name ? result : null;
  if (current?.study) return <CaseStudyView caseStudy={current.study} />;
  return (
    <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#666]">
      <p>{current ? message : "Opening…"}</p>
    </div>
  );
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
        {caseStudy.facts.map((f, i) => (
          <div key={i} className="contents">
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

// **bold** marks in the copy are shown as a light mustard highlight rather than heavier type
const highlightClass =
  "-mx-0.5 rounded-[3px] bg-[#faf3d4] px-0.5 font-normal text-inherit [box-decoration-break:clone]";

// Light text styling inside case study copy: **bold**, *italic* (or _italic_) and
// ***bold italic***, plus [[phrase|/path/to/image.webp|credit]] for a phrase that shows a picture on
// hover (the credit is optional and is printed over the picture's bottom left corner; use
// [[phrase|youtube:VIDEO_ID]] to play a YouTube video, muted, in the preview instead), and
// [text](https://…) for a link that opens in a new tab.
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\[\[[^\]|]+\|[^\]]+\]\]|\[[^[\]]+\]\(https?:\/\/[^)\s]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^[\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="-mx-0.5 rounded-[3px] px-0.5 underline decoration-[#b9b9b9] underline-offset-2 hover:bg-[#d9ebff] hover:decoration-[#333]"
        >
          {link[1]}
          <ExternalLinkIcon />
        </a>
      );
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const [phrase, src, credit] = part.slice(2, -2).split("|");
      return <HoverPhrase key={i} text={phrase} src={src} credit={credit} />;
    }
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return (
        <mark key={i} className={highlightClass}>
          <em>{part.slice(3, -3)}</em>
        </mark>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <mark key={i} className={highlightClass}>
          {part.slice(2, -2)}
        </mark>
      );
    }
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// The pictures of a scatter, laid out in percent of the board so they scale with it
function ScatterItems({ board }: { board: Extract<Block, { type: "scatter" }> }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${board.width} / ${board.height}` }}>
      {board.items.map((it, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized images
        <img
          key={i}
          src={it.src}
          alt={it.alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute block h-auto shadow-[0_1px_7px_rgba(0,0,0,0.2)]"
          style={{
            left: `${(it.x / board.width) * 100}%`,
            top: `${(it.y / board.height) * 100}%`,
            width: `${(it.w / board.width) * 100}%`,
            borderRadius: `${(it.radius / it.w) * 100}% / ${(it.radius / it.h) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

// Hover previews open on mouseenter and close on mouseleave, but a browser sends no mouseleave when
// the element goes from under a still pointer (scrolling, a window closing or re-laying out), which
// can strand a preview open. While one is open, also close it as soon as the pointer is found outside
// the element it belongs to (checked on every move, scroll and blur, and on a short timer).
const pointer = { x: -1, y: -1 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { capture: true, passive: true }
  );
}
function useDismissPreview(open: boolean, anchor: React.RefObject<HTMLElement | null>, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const check = () => {
      const a = anchor.current;
      if (!a) return closeRef.current();
      if (pointer.x < 0) return;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      if (!el || !a.contains(el)) closeRef.current();
    };
    const away = () => closeRef.current();
    window.addEventListener("pointermove", check, true);
    window.addEventListener("scroll", check, true);
    window.addEventListener("blur", away);
    document.documentElement.addEventListener("mouseleave", away);
    const timer = window.setInterval(check, 300);
    return () => {
      window.removeEventListener("pointermove", check, true);
      window.removeEventListener("scroll", check, true);
      window.removeEventListener("blur", away);
      document.documentElement.removeEventListener("mouseleave", away);
      window.clearInterval(timer);
    };
  }, [open, anchor]);
}

// A scattering of pictures (e.g. social posts). On a mouse device, hovering any of it opens an
// enlarged copy of the whole board next to the window (or over it when there's no room beside it);
// touch devices just see the small one.
function Scatter({ board }: { board: Extract<Block, { type: "scatter" }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ left: number; top: number; width: number } | null>(null);
  const [zoomable, setZoomable] = useState(true);
  useDismissPreview(!!preview, ref, () => setPreview(null));

  function show() {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const win = (el.closest(".aqua-window") ?? el).getBoundingClientRect();
    const mine = el.getBoundingClientRect();
    const aspect = board.height / board.width;
    // the enlarged copy sits on a white card with 12px of padding all round
    const pad = 24;
    const placed = placePreview({
      win,
      mine,
      aspect,
      cap: Math.min(PREVIEW_MAX_WIDTH, (window.innerHeight - PREVIEW_EDGE * 2 - pad) / aspect + pad),
      minSide: 240,
      bigEnough: (w) => w >= mine.width * 1.25,
    });
    setZoomable(!!placed);
    setPreview(placed);
  }

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={() => setPreview(null)}
      className={zoomable ? "cursor-zoom-in" : ""}
    >
      <ScatterItems board={board} />
      {preview &&
        createPortal(
          <div
            aria-hidden
            className="hover-preview pointer-events-none fixed z-[9500]"
            style={{ left: preview.left, top: preview.top, width: preview.width }}
          >
            <div className="rounded-[12px] bg-white p-3">
              <ScatterItems board={board} />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// A phrase in the body text that shows a picture when hovered, in the same style as the other
// enlarged previews. It looks like a link but isn't clickable; touch devices just see the text.
function HoverPhrase({ text, src, credit }: { text: string; src: string; credit?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const near = useNearScreen(ref);
  const videoId = src.startsWith("youtube:") ? src.slice(8) : null;
  // the picture's height over its width, known once it has loaded (a video is always 16:9)
  const [loadedRatio, setRatio] = useState<number | null>(null);
  const ratio = videoId ? 9 / 16 : loadedRatio;
  const [preview, setPreview] = useState<{ left: number; top: number; width: number } | null>(null);
  useDismissPreview(!!preview, ref, () => setPreview(null));
  useEffect(() => {
    if (!near || videoId) return;
    const img = new Image();
    img.onload = () => setRatio(img.naturalHeight / img.naturalWidth);
    img.src = src;
  }, [near, src, videoId]);

  function show() {
    const el = ref.current;
    if (!el || ratio === null || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const win = (el.closest(".aqua-window") ?? el).getBoundingClientRect();
    // the picture sits on a white card with 12px of padding all round
    const pad = 24;
    setPreview(
      placePreview({
        win,
        mine: el.getBoundingClientRect(),
        aspect: ratio,
        cap: Math.min(PREVIEW_MAX_WIDTH, (window.innerHeight - PREVIEW_EDGE * 2 - pad) / ratio + pad),
        minSide: 240,
        bigEnough: (w) => w >= 280,
      })
    );
  }

  // a video's phrase is also a link to it on YouTube (opens in a new tab)
  const Tag = videoId ? "a" : "span";
  return (
    <Tag
      ref={ref as React.Ref<HTMLAnchorElement & HTMLSpanElement>}
      {...(videoId
        ? { href: `https://www.youtube.com/watch?v=${videoId}`, target: "_blank", rel: "noopener noreferrer" }
        : {})}
      onMouseEnter={show}
      onMouseLeave={() => setPreview(null)}
      className={`-mx-0.5 rounded-[3px] px-0.5 underline decoration-[#b9b9b9] underline-offset-2 hover:bg-[#d9ebff] hover:decoration-[#333] ${
        videoId ? "" : "cursor-zoom-in"
      }`}
    >
      {text}
      {videoId && <ExternalLinkIcon />}
      {preview &&
        createPortal(
          <div
            aria-hidden
            className="hover-preview pointer-events-none fixed z-[9500]"
            style={{ left: preview.left, top: preview.top, width: preview.width }}
          >
            <div className="relative rounded-[12px] bg-white p-3">
              {videoId ? (
                // the poster shows while the player loads; the player only exists while the phrase is hovered
                <div
                  className="relative aspect-video w-full overflow-hidden rounded-[4px] bg-black bg-cover bg-center"
                  style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}
                >
                  <iframe
                    title="Video preview"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}`}
                    allow="autoplay; encrypted-media"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- static export
                <img src={src} alt="" draggable={false} className="block h-auto w-full rounded-[4px]" />
              )}
              {credit && (
                <span className="absolute bottom-[20px] left-[20px] rounded-[4px] bg-black/55 px-1.5 py-1 text-[11px] font-medium leading-none text-white">
                  {credit}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}
    </Tag>
  );
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
        <>
          {block.text && (
            <p className="mt-3">
              <Lines text={block.text} />
            </p>
          )}
          {block.note && (
            <p className={`${block.text ? "mt-2" : "mt-3"} text-[12.5px] leading-snug text-[#8c8c8c]`}>
              <Lines text={block.note} />
            </p>
          )}
        </>
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
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      );
    case "terms":
      return (
        <dl className={block.headings ? undefined : "mt-3 space-y-2.5"}>
          {block.items.map((t, i) => (
            <div key={i}>
              <dt className={block.headings ? "mb-1.5 mt-6 text-[13.5px] font-semibold leading-snug text-[#222]" : "font-semibold text-[#222]"}>
                {t.term}
              </dt>
              {/* a list gives one entry each: a string is a paragraph, a block is shown as itself */}
              {(Array.isArray(t.text) ? t.text : [t.text]).map((entry, k) =>
                typeof entry === "string" ? (
                  <dd key={k} className={k > 0 ? (block.headings ? "mt-3" : "mt-2.5") : ""}>
                    <Lines text={entry} />
                  </dd>
                ) : (
                  <dd key={k}>
                    <BlockView block={entry} />
                  </dd>
                )
              )}
            </div>
          ))}
        </dl>
      );
    case "scatter":
      return (
        <div className="mt-5">
          <Scatter board={block} />
        </div>
      );
    case "links":
      return (
        <div className="mt-2 text-[12px] leading-snug text-[#6f6f6f]">
          {block.items.map((l, k) => (
            <Fragment key={k}>
              {k > 0 && <span className="mx-1.5 text-[#c4c4c4]">|</span>}
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="-mx-0.5 rounded-[3px] px-0.5 underline decoration-[#b9b9b9] underline-offset-2 hover:bg-[#d9ebff] hover:decoration-[#333]"
              >
                {l.text}
                <ExternalLinkIcon />
              </a>
            </Fragment>
          ))}
        </div>
      );
    case "columns":
      return (
        // one column per item (two columns share the full width, so a line of text has room to stay on one line)
        <div
          className={`mt-3 grid gap-x-6 gap-y-5 sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] ${block.divider ? "items-start" : "items-center"}`}
          style={{ "--cols": block.items.length } as React.CSSProperties}
        >
          {block.items.map((c, i) => (
            <div
              key={i}
              // the faint line sits in the middle of the gap, before every column but the first
              className={`relative flex flex-col ${block.divider && i > 0 ? "sm:before:absolute sm:before:-left-3 sm:before:bottom-0 sm:before:top-0 sm:before:w-px sm:before:bg-[#e8e8e8]" : ""}`}
            >
              {c.figure && (
                <div className="mb-3">
                  <FigureView figure={c.figure} />
                </div>
              )}
              <div className="font-semibold text-[#222]">{c.title}</div>
              {/* a column can hold several lines of text; each is its own entry */}
              {(Array.isArray(c.text) ? c.text : [c.text]).map((t, k) => (
                <div key={k} className={k > 0 ? "mt-2" : undefined}>
                  <Lines text={t} />
                </div>
              ))}
              {c.note && (
                <div className="mt-2.5 text-[12.5px] leading-snug text-[#8c8c8c] [&_strong]:text-[#222]">
                  <Lines text={c.note} />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
          {block.items.map((s, i) => (
            <div key={i}>
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
          {block.zoom ? <ZoomFigure figure={block.figure} gain={1.25} /> : <FigureView figure={block.figure} bare={block.bare} />}
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
    case "tv":
      return (
        <div className="mt-5">
          <TvMockup screen={block.screen} overlay={block.overlay} video={block.video} remote={block.remote} />
          {block.caption && (
            // the caption sits under the TV, in a box as wide as the TV itself: a short caption is centred, and one that
            // wraps fills that width and stays left-aligned
            <div className="mx-auto flex w-full justify-center" style={{ maxWidth: TV_WIDTH }}>
              <p className="w-fit max-w-full text-left text-[12.5px] leading-snug text-[#8c8c8c] [&_strong]:text-[#222]">
                <Lines text={block.caption} />
              </p>
            </div>
          )}
        </div>
      );
    case "figures":
      return (
        // each image takes a share of the row in proportion to its shape, so
        // side-by-side images line up at the same height
        <div className="mt-4 flex items-start gap-3">
          {block.figures.map((f, i) => (
            <div key={i} className="min-w-0" style={{ flex: f.width / f.height }}>
              <FigureView figure={f} />
            </div>
          ))}
        </div>
      );
  }
}

function FigureView({ figure, bare }: { figure: Figure; bare?: boolean }) {
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
        className={`block h-auto w-full ${bare ? "" : "rounded-[4px] border border-[#e3e3e3]"}`}
      />
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
// the TV's width in the page
const TV_WIDTH = 520;
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

// The GIFs are a few MB each, so they only start loading as their device nears the screen
function useNearScreen(ref: React.RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
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
  }, [ref]);
  return near;
}

// Where an enlarged copy of a device goes: next to the window (right first, then left) or, when
// there's no room beside it, over the window itself. `aspect` is the device's height over its
// width, `cap` the widest it may get, `minSide` the narrowest room worth using, and `bigEnough`
// whether a candidate width is clearly bigger than the window. Returns null when there's nothing
// to gain, so the hover does nothing.
function placePreview(opts: {
  win: DOMRect;
  mine: DOMRect;
  aspect: number;
  cap: number;
  minSide: number;
  bigEnough: (width: number) => boolean;
}): { left: number; top: number; width: number } | null {
  const { win, mine, aspect, cap, minSide, bigEnough } = opts;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
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
    left = Math.min(Math.max(win.left + win.width / 2 - width / 2, PREVIEW_EDGE), vw - PREVIEW_EDGE - width);
  }
  if (!bigEnough(width)) return null;
  const height = width * aspect;
  const centre = mine.top + mine.height / 2;
  const top = Math.min(Math.max(centre - height / 2, PREVIEW_EDGE), Math.max(PREVIEW_EDGE, vh - PREVIEW_EDGE - height));
  return { left, top, width };
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
  const near = useNearScreen(rootRef);
  useDismissPreview(!!preview, rootRef, () => setPreview(null));
  const ready = useBothLoaded(near, laptop.src, ...(phone ? [phone.src] : []));

  function show(kind: Kind, el: HTMLElement) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const vh = window.innerHeight;
    const win = (rootRef.current?.closest(".aqua-window") ?? el).getBoundingClientRect();
    const aspect = kind === "laptop" ? LAPTOP_ASPECT : PHONE_ASPECT;
    const placed = placePreview({
      win,
      mine: el.getBoundingClientRect(),
      aspect,
      // the largest this device can be: its own cap, and short enough for the screen
      cap: Math.min(kind === "laptop" ? PREVIEW_MAX_WIDTH : 520, (vh - PREVIEW_EDGE * 2) / aspect),
      minSide: kind === "laptop" ? PREVIEW_MIN_WIDTH : 240,
      // "clearly bigger than the window": the laptop by width, the phone by height
      bigEnough: (w) =>
        kind === "laptop" ? w >= win.width * PREVIEW_MIN_GAIN : w * aspect >= win.height * PREVIEW_MIN_GAIN,
    });
    setZoomable((z) => ({ ...z, [kind]: !!placed }));
    if (placed) setPreview({ kind, ...placed });
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

// The remote and the thumb, drawn live over a TV's screen. They are laid out in the 2048 x 1152
// space the screen was designed in, scaled to the screen's width, and move with the video's own
// currentTime, so they are always in step with it.
const REMOTE_X = 1793;
const REMOTE_Y = 801;
const REMOTE_SCALE = 1.15;
const REMOTE_W = 190 * REMOTE_SCALE;
// where the thumb rests on each button, for a remote whose left edge is at x0
const remotePoints = (x0: number, offX: number): Record<TvRemoteKey | "off", { x: number; y: number }> => ({
  ok: { x: x0 + 95 * REMOTE_SCALE, y: REMOTE_Y + 140 * REMOTE_SCALE },
  rt: { x: x0 + 149 * REMOTE_SCALE, y: REMOTE_Y + 140 * REMOTE_SCALE },
  lt: { x: x0 + 41 * REMOTE_SCALE, y: REMOTE_Y + 140 * REMOTE_SCALE },
  up: { x: x0 + 95 * REMOTE_SCALE, y: REMOTE_Y + 86 * REMOTE_SCALE },
  dn: { x: x0 + 95 * REMOTE_SCALE, y: REMOTE_Y + 194 * REMOTE_SCALE },
  bk: { x: x0 + 95 * REMOTE_SCALE, y: REMOTE_Y + 305 * REMOTE_SCALE },
  off: { x: offX, y: 1420 },
});
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const easeInOut = (n: number) => {
  const t = clamp01(n);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function TvRemoteLayer({ remote, videoRef }: { remote: TvRemote; videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const left = remote.side === "left";
  const remoteX = left ? 2048 - REMOTE_X - REMOTE_W : REMOTE_X;
  const hostRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const okhRef = useRef<HTMLDivElement>(null);
  const bkhRef = useRef<HTMLDivElement>(null);
  const hRRef = useRef<SVGCircleElement>(null);
  const hLRef = useRef<SVGCircleElement>(null);
  const hURef = useRef<SVGCircleElement>(null);
  const aURef = useRef<SVGPathElement>(null);
  const hDRef = useRef<SVGCircleElement>(null);
  const aDRef = useRef<SVGPathElement>(null);
  const aRRef = useRef<SVGPathElement>(null);
  const aLRef = useRef<SVGPathElement>(null);
  const fingerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.getBoundingClientRect().width / 2048));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const press = (t: number, a: number, b: number) => clamp01(Math.min((t - a) / 0.08, (b - t) / 0.08));
    const keys = remote.thumb;
    const REMOTE_POINTS = remotePoints(remoteX, left ? 2048 - 1990 : 1990);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      if (!v) return;
      const t = v.currentTime;
      const act = { ok: 0, rt: 0, lt: 0, up: 0, dn: 0, bk: 0 };
      for (const [key, a, b] of remote.presses) act[key] = Math.max(act[key], press(t, a, b));
      if (okhRef.current) okhRef.current.style.opacity = String(0.26 * act.ok);
      if (bkhRef.current) bkhRef.current.style.opacity = String(0.26 * act.bk);
      if (hRRef.current) hRRef.current.style.opacity = String(0.24 * act.rt);
      if (hLRef.current) hLRef.current.style.opacity = String(0.24 * act.lt);
      if (hURef.current) hURef.current.style.opacity = String(0.24 * act.up);
      if (aURef.current) aURef.current.style.opacity = String(0.78 + 0.22 * act.up);
      if (hDRef.current) hDRef.current.style.opacity = String(0.24 * act.dn);
      if (aDRef.current) aDRef.current.style.opacity = String(0.78 + 0.22 * act.dn);
      if (aRRef.current) aRRef.current.style.opacity = String(0.78 + 0.22 * act.rt);
      if (aLRef.current) aLRef.current.style.opacity = String(0.78 + 0.22 * act.lt);
      let pos = REMOTE_POINTS[keys[0][1]];
      for (let i = 0; i < keys.length - 1; i++) {
        const [a, name] = keys[i];
        const [b, next] = keys[i + 1];
        if (t >= a && t <= b) {
          const u = easeInOut((t - a) / (b - a));
          const p0 = REMOTE_POINTS[name];
          const p1 = REMOTE_POINTS[next];
          pos = { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u };
        }
      }
      const first = keys[0][0];
      const last = keys[keys.length - 1][0];
      if (t > last) pos = REMOTE_POINTS[keys[keys.length - 1][1]];
      const f = fingerRef.current;
      if (f) {
        f.style.opacity = String(clamp01((t - first) / 0.3) * clamp01((last - t) / 0.3));
        f.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${1 - 0.16 * Math.max(act.ok, act.rt, act.lt, act.up, act.dn, act.bk)})`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [remote, videoRef, remoteX, left]);

  const dim = "inset 0 0 0 2px rgba(255,255,255,0.12)";
  return (
    <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0">
      <div style={{ position: "absolute", left: 0, top: 0, width: 2048, height: 1152, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <div
          style={{
            position: "absolute",
            left: remoteX,
            top: REMOTE_Y,
            width: 190,
            height: 420,
            transform: `scale(${REMOTE_SCALE})`,
            transformOrigin: "0 0",
            borderRadius: 46,
            background: "linear-gradient(160deg,#333338,#17171a)",
            boxShadow: "0 12px 28px rgba(0,0,0,.55), inset 0 0 0 2.5px rgba(255,255,255,.16)",
          }}
        >
          <div style={{ position: "absolute", left: 21, top: 66, width: 148, height: 148, borderRadius: "50%", background: "#0e0e11", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.1)" }} />
          <svg width="190" height="420" viewBox="0 0 190 420" style={{ position: "absolute", left: 0, top: 0 }}>
            <g fill="#fff">
              <path ref={aURef} d="M95 76 L84 93 L106 93Z" opacity=".78" />
              <path ref={aDRef} d="M95 204 L84 187 L106 187Z" opacity=".78" />
              <path ref={aLRef} d="M31 140 L48 129 L48 151Z" opacity=".78" />
              <path ref={aRRef} d="M159 140 L142 129 L142 151Z" opacity=".78" />
            </g>
            <circle ref={hRRef} cx="149" cy="140" r="27" fill="#fff" opacity="0" />
            <circle ref={hLRef} cx="41" cy="140" r="27" fill="#fff" opacity="0" />
            <circle ref={hURef} cx="95" cy="86" r="27" fill="#fff" opacity="0" />
            <circle ref={hDRef} cx="95" cy="194" r="27" fill="#fff" opacity="0" />
          </svg>
          <div style={{ position: "absolute", left: 61, top: 106, width: 68, height: 68, borderRadius: "50%", background: "#333338", boxShadow: dim, color: "#fff", font: "700 24px Helvetica, Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
            OK
            <div ref={okhRef} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0 }} />
          </div>
          <div style={{ position: "absolute", left: 65, top: 275, width: 60, height: 60, borderRadius: "50%", background: "#333338", boxShadow: dim }}>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", left: 0, top: 0 }}>
              <path d="M42 30 H18 M28 19 L17 30 L28 41" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".88" />
            </svg>
            <div ref={bkhRef} style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0 }} />
          </div>
        </div>
        <div
          ref={fingerRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 84,
            height: 84,
            margin: "-42px 0 0 -42px",
            borderRadius: "50%",
            opacity: 0,
            background: "radial-gradient(circle at 34% 28%, rgba(255,255,255,.9), rgba(255,255,255,.4) 48%, rgba(255,255,255,.18) 100%)",
            border: "3px solid rgba(255,255,255,.95)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.18), 0 14px 30px rgba(0,0,0,.32), inset 0 3px 5px rgba(255,255,255,.95), inset 0 -8px 14px rgba(0,0,0,.12)",
          }}
        />
      </div>
    </div>
  );
}

// A plain flat-screen TV: a thin dark bezel around the screen and a small stand.
// `scale` thickens the bezel and stand when the TV is drawn larger. The screen shows `figure`
// (an image or GIF) or, with `video`, a muted looping video with the remote drawn live over it.
function TvFrame({
  figure,
  overlay,
  video,
  remote,
  videoRef,
  startAt,
  ready,
  scale,
}: {
  figure: Figure;
  overlay?: TvOverlay;
  video?: string;
  remote?: TvRemote;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  startAt?: number;
  ready: boolean;
  scale: number;
}) {
  const ownRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? ownRef;
  return (
    <div className="w-full">
      <div
        className="bg-[#1c1c1e] shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
        style={{ borderRadius: 5 * scale, padding: 5 * scale }}
      >
        <div className="relative">
          {video && ready ? (
            <video
              ref={ref}
              src={video}
              poster={figure.src}
              aria-label={figure.alt}
              muted
              loop
              autoPlay
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                if (startAt) e.currentTarget.currentTime = startAt;
              }}
              className="block h-auto w-full bg-black"
              style={{ borderRadius: 1.5 * scale, aspectRatio: `${figure.width} / ${figure.height}` }}
            />
          ) : (
            <Screen figure={figure} ready={video ? true : ready} radius={1.5 * scale} />
          )}
          {video && ready && remote && <TvRemoteLayer remote={remote} videoRef={ref} />}
          {overlay && ready && (
            // eslint-disable-next-line @next/next/no-img-element -- animated PNG, positioned over the screen
            <img
              src={overlay.src}
              alt={overlay.alt}
              draggable={false}
              className="pointer-events-none absolute h-auto"
              style={{ left: `${overlay.left}%`, top: `${overlay.top}%`, width: `${overlay.width}%` }}
            />
          )}
        </div>
      </div>
      <div
        className="mx-auto bg-gradient-to-b from-[#9d9da1] to-[#c9c9cd]"
        style={{ width: "22%", height: 9 * scale, clipPath: "polygon(22% 0, 78% 0, 100% 100%, 0 100%)" }}
      />
      <div
        className="mx-auto bg-gradient-to-b from-[#d4d4d7] to-[#b2b2b6] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        style={{ width: "38%", height: 4 * scale, borderRadius: `${2 * scale}px` }}
      />
    </div>
  );
}

// A TV showing a GIF or a video, in the page. Like the laptop and phone, hovering it on a mouse
// device opens a bigger copy next to (or over) the window; touch devices just see the small one.
function TvMockup({ screen, overlay, video, remote }: { screen: Figure; overlay?: TvOverlay; video?: string; remote?: TvRemote }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<{ left: number; top: number; width: number; startAt: number } | null>(null);
  const [zoomable, setZoomable] = useState(true);
  useDismissPreview(!!preview, rootRef, () => setPreview(null));
  const near = useNearScreen(rootRef);
  // the overlay (e.g. a remote) is its own animation, so it starts together with the screen
  const gifReady = useBothLoaded(near && !video, screen.src, ...(overlay ? [overlay.src] : []));
  const ready = video ? near : gifReady;

  function show(el: HTMLElement) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const win = (rootRef.current?.closest(".aqua-window") ?? el).getBoundingClientRect();
    const mine = el.getBoundingClientRect();
    const aspect = mine.height / mine.width;
    const placed = placePreview({
      win,
      mine,
      aspect,
      cap: Math.min(PREVIEW_MAX_WIDTH, (window.innerHeight - PREVIEW_EDGE * 2) / aspect),
      minSide: PREVIEW_MIN_WIDTH,
      bigEnough: (w) => w >= win.width * PREVIEW_MIN_GAIN,
    });
    setZoomable(!!placed);
    // the bigger copy picks up where the small one is
    setPreview(placed ? { ...placed, startAt: videoRef.current?.currentTime ?? 0 } : null);
  }

  return (
    <div
      ref={rootRef}
      // an overlay can hang below the TV, so leave room for it
      className={`relative mx-auto w-full ${overlay || remote ? "mb-6" : ""}`}
      style={{ maxWidth: TV_WIDTH }}
    >
      <div
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setPreview(null)}
        className={zoomable ? "cursor-zoom-in" : ""}
      >
        <TvFrame figure={screen} overlay={overlay} video={video} remote={remote} videoRef={videoRef} ready={ready} scale={1} />
      </div>
      {preview &&
        createPortal(
          <div
            aria-hidden
            className="hover-preview pointer-events-none fixed z-[9500]"
            style={{ left: preview.left, top: preview.top, width: preview.width }}
          >
            <TvFrame
              figure={screen}
              overlay={overlay}
              video={video}
              remote={remote}
              startAt={preview.startAt}
              ready={ready}
              scale={Math.max(1, preview.width / TV_WIDTH)}
            />
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
    const ok = await unlock(value);
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
function ZoomFigure({ figure, gain = 1.5 }: { figure: Figure; gain?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ left: number; top: number; width: number } | null>(null);
  const [zoomable, setZoomable] = useState(true);
  useDismissPreview(!!preview, ref, () => setPreview(null));

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
    const bigEnough = (w: number) => w >= mine.width * gain;
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
