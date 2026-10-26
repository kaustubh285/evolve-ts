import { cn } from "#/lib/utils";

/** A toggle-style button: filled when `pressed`. Used for 1–5 / 1–10 scales and small choices. */
export function ChoiceButton({
  pressed,
  className,
  ...props
}: React.ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "h-9 rounded-md border text-sm transition-colors hover:bg-accent",
        "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
