import { MiniCalendar } from "@mantine/dates";
import { RANGE_DAYS } from "#/lib/date-range";

type RangeMiniCalendarProps = {
  /** First visible day (ISO). */
  from: string;
  /** Days that get a dot (ISO), e.g. days with a check-in. */
  marked: Set<string>;
  /** What a dot means, for screen readers: "checked in", "workout". */
  markLabel: string;
  /** Arrows pressed → new first day. */
  onChange: (from: string) => void;
};

/** RANGE_DAYS-day strip with paging arrows. Fits a phone, dots the marked days. */
export function RangeMiniCalendar({
  from,
  marked,
  markLabel,
  onChange,
}: RangeMiniCalendarProps) {
  return (
    <MiniCalendar
      size="md"
      numberOfDays={RANGE_DAYS}
      // Shrink to the space available instead of fit-content (which overflowed
      // phones): the strip grows up to 460px and the days share it evenly.
      style={{ flex: "1 1 280px", maxWidth: 460 }}
      styles={{
        root: { width: "100%" },
        days: { flex: 1 },
        day: { flex: 1, minWidth: 0, paddingInline: 0 },
      }}
      // Small accent dot under marked days.
      getDayProps={(day) =>
        marked.has(day)
          ? {
              style: {
                backgroundImage:
                  "radial-gradient(circle, var(--mantine-primary-color-filled) 2px, transparent 2.5px)",
                backgroundSize: "6px 6px",
                backgroundPosition: "center bottom 4px",
                backgroundRepeat: "no-repeat",
              },
              // Mantine labels days "2026-11-10"; keep that format, add the status.
              "aria-label": `${day}, ${markLabel}`,
            }
          : {}
      }
      date={from}
      onDateChange={onChange}
    />
  );
}
