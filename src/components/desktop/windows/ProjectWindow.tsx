export function ProjectWindow({ message }: { message: string }) {
  return (
    // plain white content, like about.txt; the window itself is the tall shape
    <div className="min-h-full bg-white p-5 text-[13px] leading-relaxed text-[#666]">
      <p>{message}</p>
    </div>
  );
}
