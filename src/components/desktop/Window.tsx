"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const SLIVER = 48;

// fields that bring up the on-screen keyboard
const isTextField = (el: EventTarget) =>
  el instanceof HTMLElement &&
  el.matches(
    'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="hidden"])'
  );

// while dragging, a window may be pushed past the screen edges, but never so
// far that it can't be grabbed again: a sliver stays visible horizontally and
// the title bar stays on screen vertically
const TITLEBAR_HEIGHT = 32;
function clampDrag(x: number, y: number, w: number) {
  return {
    x: clamp(x, SLIVER - w, window.innerWidth - SLIVER),
    y: clamp(y, 0, window.innerHeight - TITLEBAR_HEIGHT),
  };
}

// below Tailwind's `sm`, windows are centered with fixed side padding instead
// of sitting at their own position
const MOBILE_QUERY = "(max-width: 639px)";
const MOBILE_SIDE_PADDING = 10;
// an expanded window hugs the screen edges, but leaves room under it so the
// desktop footer stays visible
const MOBILE_EXPANDED_EDGE = 2;
// (the mobile footer is sized to this same height — see Footer.tsx)
const MOBILE_FOOTER_ROOM = 40;

function useIsMobile() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

// lets a window's content ask for a different window width (e.g. a Finder-style
// column opening to the right); undefined goes back to the default width
const WindowWidthContext = createContext<(w: number | undefined) => void>(() => {});

export function useRequestedWidth(w: number | undefined) {
  const requestWidth = useContext(WindowWidthContext);
  useEffect(() => {
    requestWidth(w);
  }, [w, requestWidth]);
}

export function Window({
  title,
  zIndex,
  isActive,
  initial,
  width = 480,
  hidden = false,
  expandOnMobile = false,
  centerOnOpen = false,
  centerOffset = { x: 0, y: 0 },
  windowHeight,
  windowWidth,
  origin,
  getCloseOrigin,
  onClose,
  onFocus,
  children,
}: {
  title: string;
  icon?: ReactNode;
  zIndex: number;
  isActive: boolean;
  initial: { x: number; y: number };
  width?: number;
  hidden?: boolean;
  // on mobile, nearly fill the screen (still a draggable, rounded window)
  // instead of floating centered at its natural size
  expandOnMobile?: boolean;
  // on desktop, open exactly centered on screen (mobile is always centered)
  centerOnOpen?: boolean;
  // nudges a centered window off the exact middle, in px
  centerOffset?: { x: number; y: number };
  // fixed height on desktop (a CSS length); otherwise the height follows the content
  windowHeight?: string;
  // fixed width on desktop (a CSS length); otherwise `width` capped at 92vw
  windowWidth?: string;
  origin?: { x: number; y: number };
  getCloseOrigin?: () => { x: number; y: number } | undefined;
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [pos, setPos] = useState(
    isMobile && expandOnMobile
      ? { x: MOBILE_EXPANDED_EDGE, y: MOBILE_EXPANDED_EDGE }
      : initial
  );
  const [dragging, setDragging] = useState(false);
  // on mobile a window starts centered by CSS; once grabbed it switches to
  // explicit left/top coordinates like on desktop
  const [detached, setDetached] = useState(false);
  // While a text field has focus on a phone the keyboard is up: the window pins to
  // the top of what's visible (instead of staying centred in the full screen,
  // which makes it jump as the keyboard comes and goes between fields).
  // It un-pins when the keyboard goes away, which on a phone doesn't always
  // blur the field, so the visible area is watched as well as focus.
  const [fieldFocused, setFieldFocused] = useState(false);
  // holds the visible area while pinned, otherwise null
  const [keyboard, setKeyboard] = useState<{ height: number; top: number } | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fieldFocusedRef = useRef(false);
  const baselineRef = useRef(0); // visible height before the keyboard came up
  const keyboardSeenRef = useRef(false);
  const pinnedForKeyboard = isMobile && !expandOnMobile && keyboard !== null;

  function readVisibleArea() {
    const vv = window.visualViewport;
    return { height: vv?.height ?? window.innerHeight, top: vv?.offsetTop ?? 0 };
  }
  function onFieldFocus(e: React.FocusEvent) {
    clearTimeout(blurTimer.current);
    if (!(isMobile && !expandOnMobile && isTextField(e.target))) return;
    const area = readVisibleArea();
    if (!fieldFocusedRef.current) {
      baselineRef.current = area.height;
      keyboardSeenRef.current = false;
    }
    fieldFocusedRef.current = true;
    setFieldFocused(true);
    setKeyboard(area); // pin right away; the keyboard is still sliding up
  }
  function onFieldBlur() {
    // a short delay, so moving from one field to the next doesn't un-pin in between
    clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      fieldFocusedRef.current = false;
      setFieldFocused(false);
      setKeyboard(null);
    }, 150);
  }
  useEffect(() => {
    if (!fieldFocused) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      if (vv.height < baselineRef.current - 100) {
        // keyboard is up (also when it comes back up in a field that never lost focus)
        keyboardSeenRef.current = true;
        setKeyboard({ height: vv.height, top: vv.offsetTop });
      } else if (keyboardSeenRef.current && vv.height >= baselineRef.current - 60) {
        // keyboard dismissed while the field kept focus: back to the centre
        keyboardSeenRef.current = false;
        setKeyboard(null);
      } else {
        setKeyboard((k) => (k ? { height: vv.height, top: vv.offsetTop } : k));
      }
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [fieldFocused]);
  useEffect(() => () => clearTimeout(blurTimer.current), []);
  const centeredByCss =
    (isMobile ? !expandOnMobile : centerOnOpen) && !detached;
  const windowRef = useRef<HTMLDivElement>(null);
  const [widthOverride, setWidthOverride] = useState<number>();
  const closingRef = useRef(false);
  // once the user has dragged, a partly off-screen position is deliberate and
  // must survive resizes and width changes
  const draggedRef = useRef(false);

  // where the window's center rests on screen, ignoring any running transform
  function restingCenter(el: HTMLElement) {
    return centeredByCss
      ? { x: window.innerWidth / 2 + centerOffset.x, y: window.innerHeight / 2 + centerOffset.y }
      : { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  }

  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0, w: 0, h: 0 });

  const requestWidth = useCallback(
    (w: number | undefined) => {
      setWidthOverride(w);
      // growing rightwards must not push the window off-screen
      const effective = Math.min(window.innerWidth * 0.92, w ?? width);
      setPos((p) =>
        p.x < 0 ? p : { ...p, x: Math.min(p.x, Math.max(0, window.innerWidth - effective)) }
      );
    },
    [width]
  );

  // grow out of the icon it was opened from (mount == open)
  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el || !origin) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // offset* ignore transforms, so a re-run (StrictMode) mid-animation
    // still measures the window's real resting place
    const center = restingCenter(el);
    const dx = origin.x - center.x;
    const dy = origin.y - center.y;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.1)`, opacity: 0 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 270, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    // runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function clampToViewport() {
      const el = windowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((p) =>
        draggedRef.current
          ? clampDrag(p.x, p.y, rect.width)
          : {
              x: clamp(p.x, 0, Math.max(0, window.innerWidth - rect.width)),
              y: clamp(p.y, 0, Math.max(0, window.innerHeight - rect.height)),
            }
      );
    }
    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, []);

  // slide to the nearest side edge, leaving a sliver to click to bring it back
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    if (!hidden) {
      el.style.transform = "";
      return;
    }
    const rect = el.getBoundingClientRect();
    const toLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
    const dx = toLeft ? -(rect.right - SLIVER) : window.innerWidth - rect.left - SLIVER;
    el.style.transform = `translateX(${dx}px)`;
  }, [hidden]);

  // inverse of the open animation: shrink back into the icon, then unmount
  function requestClose() {
    if (closingRef.current) return;
    const el = windowRef.current;
    const target = getCloseOrigin?.() ?? origin;
    if (
      !el ||
      !target ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    closingRef.current = true;
    const center = restingCenter(el);
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const anim = el.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.1)`, opacity: 0 },
      ],
      { duration: 270, easing: "cubic-bezier(0.32, 0, 0.67, 0)", fill: "forwards" }
    );
    anim.onfinish = onClose;
  }

  useEffect(() => {
    if (!isActive || hidden) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, hidden, onClose, getCloseOrigin, origin]);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      draggedRef.current = true;
      setPos(
        clampDrag(dragStart.current.winX + dx, dragStart.current.winY + dy, dragStart.current.w)
      );
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  function onTitlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-titlebar-button]")) return;
    onFocus();
    const rect = windowRef.current?.getBoundingClientRect();
    if (centeredByCss && rect) {
      setPos({ x: rect.left, y: rect.top });
      setDetached(true);
    }
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: centeredByCss && rect ? rect.left : pos.x,
      winY: centeredByCss && rect ? rect.top : pos.y,
      w: rect?.width ?? 0,
      h: rect?.height ?? 0,
    };
    setDragging(true);
  }

  return (
    <div
      ref={windowRef}
      className="aqua-window absolute flex flex-col"
      style={{
        ...(pinnedForKeyboard
          ? {
              // a window still centred by CSS keeps its horizontal centring (only
              // the vertical part of `translate` changes), otherwise it would
              // swoop in sideways as `translate` animates to nothing
              left: centeredByCss ? `calc(50% + ${centerOffset.x}px)` : MOBILE_SIDE_PADDING,
              top: keyboard.top + MOBILE_SIDE_PADDING,
              translate: centeredByCss ? "-50% 0" : "none",
              width: `calc(100vw - ${MOBILE_SIDE_PADDING * 2}px)`,
              // never taller than the visible area, so the fields stay above the keyboard
              maxHeight: Math.max(160, keyboard.height - MOBILE_SIDE_PADDING * 2),
            }
          : isMobile && expandOnMobile
          ? {
              left: pos.x,
              top: pos.y,
              width: `calc(100vw - ${MOBILE_EXPANDED_EDGE * 2}px)`,
              height: `calc(100dvh - ${MOBILE_EXPANDED_EDGE + MOBILE_FOOTER_ROOM}px)`,
            }
          : centeredByCss
          ? {
              left: `calc(50% + ${centerOffset.x}px)`,
              top: `calc(50% + ${centerOffset.y}px)`,
              // the standalone `translate` property composes with the
              // `transform` used by the animations, so they don't fight
              translate: "-50% -50%",
              maxHeight: "88vh",
              ...(!isMobile && windowHeight ? { height: windowHeight } : {}),
              width: isMobile
                ? `calc(100vw - ${MOBILE_SIDE_PADDING * 2}px)`
                : windowWidth ?? `min(92vw, ${widthOverride ?? width}px)`,
            }
          : {
              left: pos.x,
              top: pos.y,
              maxHeight: "88vh",
              ...(!isMobile && windowHeight ? { height: windowHeight } : {}),
              width: isMobile
                ? `calc(100vw - ${MOBILE_SIDE_PADDING * 2}px)`
                : windowWidth ?? `min(92vw, ${widthOverride ?? width}px)`,
            }),
        zIndex,
        transition:
          "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), width 0.3s cubic-bezier(0.22, 1, 0.36, 1)" +
          // glide to and from the pinned position (but never lag a drag)
          (isMobile && !dragging ? ", top 0.25s ease, translate 0.25s ease" : ""),
      }}
      onPointerDown={onFocus}
      onFocus={onFieldFocus}
      onBlur={onFieldBlur}
    >
      <div
        onPointerDown={onTitlePointerDown}
        className={`flex shrink-0 touch-none select-none items-center py-1.5 pl-3 pr-3 ${
          isActive ? "aqua-titlebar" : "aqua-titlebar-inactive"
        }`}
      >
        <div className="titlebar-side flex shrink-0 items-center gap-1.5">
          <button
            data-titlebar-button
            aria-label="Close"
            title="Close (Esc)"
            onClick={requestClose}
            className="aqua-dot aqua-dot-red"
          >
            <span className="aqua-dot-glyph">✕</span>
          </button>
          {/* keyboard hint, only on devices with a mouse, and only on the
              window Esc would actually close */}
          <span
            aria-hidden
            className={`esc-hint text-[11px] leading-none tracking-wide text-black/40 ${
              isActive ? "" : "opacity-0"
            }`}
          >
            Esc
          </span>
        </div>
        <span className="flex-1 truncate px-2 text-center text-[13px] font-medium text-black/80">
          {title}
        </span>
        {/* mirrors the left cluster's width so the title stays centred */}
        <div className="titlebar-side shrink-0" aria-hidden />
      </div>

      <WindowWidthContext.Provider value={requestWidth}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-chrome">{children}</div>
      </WindowWidthContext.Provider>
    </div>
  );
}
