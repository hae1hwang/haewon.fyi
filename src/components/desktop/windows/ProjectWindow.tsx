export function ProjectWindow({ folder, title }: { folder: string; title: string }) {
  return (
    <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a]">
      <p className="mb-1 text-[11px] text-[#777]">{folder}</p>
      <h2 className="mb-4 text-[18px] font-semibold">{title}</h2>
      <p className="text-[#777]">Case study coming soon.</p>
    </div>
  );
}
