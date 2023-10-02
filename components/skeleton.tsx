import cn from "@/lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-background/10 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export default Skeleton;
