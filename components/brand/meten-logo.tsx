import Image from "next/image";
import { cn } from "@/lib/utils";

type MetenLogoProps = {
  className?: string;
  variant?: "compact" | "full";
};

export function MetenLogo({ className, variant = "compact" }: MetenLogoProps) {
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        compact ? "h-10 w-32" : "h-28 w-44",
        className
      )}
      aria-label="Meten"
    >
      <Image
        src="/metenlogo.png"
        alt="Meten"
        fill
        priority
        sizes={compact ? "128px" : "176px"}
        className={cn(
          "object-contain mix-blend-multiply",
          compact ? "scale-[2.85]" : "scale-125"
        )}
      />
    </div>
  );
}
