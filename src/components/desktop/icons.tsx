function IconImage({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} style={{ objectFit: "contain" }} />
  );
}

export function FolderIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/folder.png" className={className} />;
}

export function NoteIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/doc.png" className={className} />;
}

export function ResumeIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/pdf.png" className={className} />;
}

export function MailIcon({ className }: { className?: string }) {
  return <IconImage src="/icons/mail.png" className={className} />;
}
