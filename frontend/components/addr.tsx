import { truncateAddr } from "@/lib/format";

export function Addr({ value, full = false, className = "" }: { value: string; full?: boolean; className?: string }) {
  return (
    <span className={`font-mono ${className}`} title={value}>
      {full ? value : truncateAddr(value)}
    </span>
  );
}
