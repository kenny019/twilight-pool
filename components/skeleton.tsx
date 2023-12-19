import cn from "@/lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-skeleton animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export default Skeleton;
