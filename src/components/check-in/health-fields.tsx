import { NumberInput, Textarea } from "@mantine/core";
import { useCheckInFormContext } from "./form-context";

// Later: linked workouts and health events for the day go in this section too.
export function HealthFields() {
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
      <Textarea
        label="Notes"
        autosize
        minRows={3}
        {...form.getInputProps("notes")}
      />
    </>
  );
}
