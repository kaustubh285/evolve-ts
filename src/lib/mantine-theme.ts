import {
  type CSSVariablesResolver,
  createTheme,
  type MantineColorsTuple,
} from "@mantine/core";

// Evolve's palette (paper / ink / rust) expressed as Mantine colour tuples.
// Mantine needs 10 shades per colour, lightest (0) → darkest (9).

// Accent. Light mode uses shade 6 (#b4532a), dark mode shade 4 (#e07a4b).
const rust: MantineColorsTuple = [
  "#fbf0ea",
  "#f4dccf",
  "#ebbfa7",
  "#e39c7a",
  "#e07a4b",
  "#c9653a",
  "#b4532a",
  "#954421",
  "#763519",
  "#562611",
];

// Light mode: Mantine uses gray[3–4] for borders, gray[6] for "dimmed" text.
// Warm grays instead of Mantine's blue-ish ones keep the paper feel.
const gray: MantineColorsTuple = [
  "#faf6ee",
  "#f1ebdf",
  "#e9e2d3",
  "#d8cfbe",
  "#cfc5b2",
  "#a99f8f",
  "#6f665a",
  "#4f473d",
  "#352f28",
  "#1f1b16",
];

// Dark mode ("lamp"): Mantine uses dark[7] for the page, dark[6] for inputs
// and cards, dark[4] for borders, dark[0] for text, dark[2] for dimmed text.
const dark: MantineColorsTuple = [
  "#ece4d6",
  "#d6ccbc",
  "#a79c8b",
  "#7d7365",
  "#463e34",
  "#3a332b",
  "#2a251f",
  "#171411",
  "#120f0d",
  "#0d0b09",
];

export const theme = createTheme({
  primaryColor: "rust",
  primaryShade: { light: 6, dark: 4 },
  colors: { rust, gray, dark },
  white: "#fbf8f1",
  black: "#1f1b16",

  fontFamily:
    "'Comic Neue', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily:
      "'Comic Neue', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },

  defaultRadius: "md",
  radius: { md: "0.375rem" },
});

// Light-mode page background is paper, not white (dark mode uses dark[7]).
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-body": "#f4efe4",
    "--mantine-color-text": "#1f1b16",
  },
  dark: {},
});
