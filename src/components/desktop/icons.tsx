// `shadowed` swaps in a copy of the icon with its drop shadow baked into the
// image (padded 16% on every side to hold it). The desktop uses these instead of
// a CSS drop-shadow filter, which iOS WebKit rendered badly.
type IconProps = { className?: string; shadowed?: boolean };

function IconImage({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} style={{ objectFit: "contain" }} />
  );
}

export function FolderIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/folder.png" className={className} />;
}

// the work folder: same folder with a laptop on its face
export function WorkFolderIcon({ className, shadowed }: IconProps) {
  return (
    <IconImage
      src={shadowed ? "/icons/folder-laptop-shadow.png" : "/icons/folder-laptop.png"}
      className={className}
    />
  );
}

// the fun folder: same folder with a paintbrush on its face
export function FunFolderIcon({ className, shadowed }: IconProps) {
  return (
    <IconImage
      src={shadowed ? "/icons/folder-brush-shadow.png" : "/icons/folder-brush.png"}
      className={className}
    />
  );
}

export function NoteIcon({ className, shadowed }: IconProps) {
  return (
    <IconImage
      src={shadowed ? "/icons/doc-shadow.png" : "/icons/doc.png"}
      className={className}
    />
  );
}

export function ResumeIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/pdf.png" className={className} />;
}

export function MailIcon({ className, shadowed }: IconProps) {
  return (
    <IconImage
      src={shadowed ? "/icons/mail-shadow.png" : "/icons/mail.png"}
      className={className}
    />
  );
}

// a small padlock for projects that need a password (drawn in the surrounding text colour)
export function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 14" className={className} fill="none" aria-hidden>
      <rect x="1.5" y="6" width="9" height="7" rx="1.6" fill="currentColor" />
      <path d="M3.6 6V4.2a2.4 2.4 0 0 1 4.8 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
