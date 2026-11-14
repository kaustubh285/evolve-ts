import { Input, SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import { useId } from "react";

// 1–10 pain/symptom scale, banded the way clinical pain scales usually are.
// Colour is the quick read; the band name is always shown too (never colour alone).
export const SEVERITY_BANDS = [
  { max: 3, label: "Mild", color: "teal" },
  { max: 6, label: "Moderate", color: "yellow" },
  { max: 8, label: "Severe", color: "orange" },
  { max: 10, label: "Very severe", color: "red" },
] as const;

export const severityBand = (n: number) =>
  SEVERITY_BANDS.find((b) => n <= b.max) ??
  SEVERITY_BANDS[SEVERITY_BANDS.length - 1];

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

type SeverityPickerProps = {
  label?: string;
  /** Mantine form shape: a number, or "" when not set. */
  value?: number | string;
  onChange: (value: number | string) => void;
  error?: React.ReactNode;
};

/**
 * Row of 10 numbered boxes, tinted mild → very severe.
 * A radio group for screen readers and keyboards (arrow keys move, like native radios).
 * Tapping the selected box again clears it (severity is optional).
 */
export function SeverityPicker({
  label = "Severity",
  value,
  onChange,
  error,
}: SeverityPickerProps) {
  const id = useId();
  const selected = typeof value === "number" ? value : null;
  const band = selected != null ? severityBand(selected) : null;

  function onKeyDown(e: React.KeyboardEvent, n: number) {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.min(10, Math.max(1, n + step));
    onChange(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }

  return (
    <Input.Wrapper
      label={label}
      error={error}
      description={
        band ? (
          <Text
            span
            size="xs"
            fw={600}
            style={{ color: `var(--mantine-color-${band.color}-text)` }}
          >
            {selected} · {band.label}
          </Text>
        ) : (
          "Tap a number — 1 barely noticeable, 10 worst ever"
        )
      }
      inputWrapperOrder={["label", "input", "description", "error"]}
    >
      <SimpleGrid
        cols={10}
        spacing={4}
        role="radiogroup"
        aria-label={label}
        mt={4}
      >
        {LEVELS.map((n) => {
          const b = severityBand(n);
          const checked = selected === n;
          return (
            <UnstyledButton
              key={n}
              id={`${id}-${n}`}
              role="radio"
              aria-checked={checked}
              aria-label={`${n}, ${b.label}`}
              // Roving tabindex: one tab stop for the group, arrows move inside it.
              tabIndex={checked || (selected == null && n === 1) ? 0 : -1}
              onClick={() => onChange(checked ? "" : n)}
              onKeyDown={(e) => onKeyDown(e, n)}
              style={{
                height: 36,
                borderRadius: "var(--mantine-radius-sm)",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "var(--mantine-font-size-sm)",
                // Unselected: light tint of the band. Selected: solid band colour.
                background: checked
                  ? `var(--mantine-color-${b.color}-filled)`
                  : `var(--mantine-color-${b.color}-light)`,
                color: checked
                  ? `var(--mantine-color-${b.color}-contrast, white)`
                  : `var(--mantine-color-${b.color}-light-color)`,
                outline: checked
                  ? `2px solid var(--mantine-color-${b.color}-filled)`
                  : undefined,
                outlineOffset: 2,
              }}
            >
              {n}
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Input.Wrapper>
  );
}
