import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?url";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { cssVariablesResolver, theme } from "#/lib/mantine-theme";
import fontRegular from "../assets/fonts/comic-neue/ComicNeue-Regular.woff2?url";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Evolve",
      },
      {
        name: "theme-color",
        content: "#f4efe4",
        media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#171411",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    links: [
      // Body weight: fetch in parallel with the CSS instead of after it.
      {
        rel: "preload",
        href: fontRegular,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      // Mantine first, ours after (ours wins where both style the same thing).
      { rel: "stylesheet", href: mantineCss },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // mantineHtmlProps + ColorSchemeScript: Mantine sets
    // data-mantine-color-scheme on <html> before first paint (no flash).
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <HeadContent />
      </head>
      <body className="">
        <MantineProvider
          theme={theme}
          cssVariablesResolver={cssVariablesResolver}
          defaultColorScheme="light"
        >
          {children}
        </MantineProvider>
        <TanStackDevtools
          config={{
            // bottom-left: bottom-right is where the quick-add "+" lives.
            position: "bottom-left",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
