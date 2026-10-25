import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";
import fontRegular from "../assets/fonts/comic-neue/ComicNeue-Regular.woff2?url";

import type { QueryClient } from "@tanstack/react-query";
import { themeInitScript } from "#/lib/theme";

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
    // The theme script adds `dark` to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static script we own, must run before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
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
