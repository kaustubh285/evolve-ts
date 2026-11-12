import { SimpleGrid, Text, TextInput } from "@mantine/core";
import { useCheckInFormContext } from "./form-context";

const DAY_MIN = 24 * 60;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "23:30" → "07:10" = 7h 40m. Bedtime later than wake-up means the night before. */
function sleepDuration(start: string, end: string): string | null {
  if (!start || !end) return null;
  const mins = (toMinutes(end) - toMinutes(start) + DAY_MIN) % DAY_MIN;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function SleepFields() {
  const form = useCheckInFormContext();
  const { sleepStart, sleepEnd } = form.getValues();
  const duration = sleepDuration(sleepStart, sleepEnd);

  return (
    <>
      {/* Two narrow time pickers fit side by side even on a phone. */}
      <SimpleGrid cols={2} spacing="sm">
        <TextInput
          type="time"
          label="Went to bed"
          {...form.getInputProps("sleepStart")}
        />
        <TextInput
          type="time"
          label="Woke up"
          {...form.getInputProps("sleepEnd")}
        />
      </SimpleGrid>
      {duration && (
        <Text c="dimmed" size="sm">
          <span
            style={{
              textDecoration: "underline",
              color: "var(--mantine-primary)",
            }}
          >
            {duration}
          </span>{" "}
          of sleep
        </Text>
      )}
    </>
  );
}
