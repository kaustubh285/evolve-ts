import { NumberInput, Textarea } from "@mantine/core";
import { useCheckInFormContext } from "./form-context";

/**
 * Steps and notes. `children` renders between them — the check-in form puts the
 * day's workouts and health events there.
 */
export function HealthFields({ children }: { children?: React.ReactNode }) {
  const form = useCheckInFormContext();

  return (
    <>
      <NumberInput
        label="Steps"
        min={0}
        max={200_000}
        allowDecimal={false}
        allowNegative={false}
        thousandSeparator=","
        {...form.getInputProps("steps")}
      />
      {children}
      <Textarea
        label="Notes"
        autosize
        minRows={3}
        {...form.getInputProps("notes")}
      />
    </>
  );
}
