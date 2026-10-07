import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bb-skeleton rounded-lg bg-secondary", className)} {...props} />;
}

export { Skeleton };
