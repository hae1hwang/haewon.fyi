export function ProjectWindow({ message }: { message: string }) {
  return (
    // laid out like a document page: a comfortable reading column with generous margins
    <div className="min-h-full bg-white px-8 py-10 text-[13px] leading-relaxed text-[#666] sm:px-14 sm:py-12">
      <div className="mx-auto max-w-[680px]">
        <p>{message}</p>
      </div>
    </div>
  );
}
