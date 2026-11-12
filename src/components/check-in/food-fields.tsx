import { Chip, Group, Text, Textarea } from "@mantine/core";
import { useCheckInFormContext } from "./form-context";

export function FoodFields() {
  const form = useCheckInFormContext();

  return (
    <>
      <Textarea
        label="What did you eat?"
        autosize
        minRows={2}
        {...form.getInputProps("meal")}
      />
      <div>
        <Text size="sm" fw={500} mb={6}>
          Protein at
        </Text>
        {/* Chips: bigger tap targets than checkboxes, and they wrap on narrow screens. */}
        <Group gap="xs">
          <Chip
            size="sm"
            {...form.getInputProps("proteinAtBreakfast", { type: "checkbox" })}
          >
            Breakfast
          </Chip>
          <Chip
            size="sm"
            {...form.getInputProps("proteinAtLunch", { type: "checkbox" })}
          >
            Lunch
          </Chip>
          <Chip
            size="sm"
            {...form.getInputProps("proteinAtDinner", { type: "checkbox" })}
          >
            Dinner
          </Chip>
        </Group>
      </div>
    </>
  );
}
