import { Divider, Grid, Stack, Text } from "@mantine/core";

type FormSectionProps = {
  title: React.ReactNode;
  /** One short line explaining the section. */
  description?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * A quiet heading + fields block for long forms.
 * Phone: heading on top, fields below. sm and up: heading on the left, fields on the right.
 */
export function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <Stack gap="md">
      <Divider />
      <Grid rowGap="xs" columnGap="xl">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          {description && (
            <Text c="dimmed" size="xs">
              {description}
            </Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Stack gap="sm">{children}</Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
