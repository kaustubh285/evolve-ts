import {
  Container,
  type ContainerProps,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { type Crumb, EvolveBreadcrumbs } from "./breadcrumbs";

type PageWrapperProps = {
  /** Page heading. Omit for pages that draw their own. */
  title?: React.ReactNode;
  /** Smaller line under the title. */
  description?: React.ReactNode;
  /** Shown on the right of the title (e.g. a button). */
  actions?: React.ReactNode;
  /** Max content width. "md" ≈ 960px; use "sm" for forms, "lg" for wide grids. */
  size?: ContainerProps["size"];
  /** Trail above the title, e.g. Check-in / Thu 12 Nov. Last item = this page (no link). */
  breadcrumbs?: Crumb[];
  children: React.ReactNode;
};

/**
 * The frame every signed-in page renders inside: consistent width, padding,
 * and an optional title row. Lives inside AppShell.Main (see _authed.tsx).
 */
export function PageWrapper({
  title,
  description,
  actions,
  size = "md",
  breadcrumbs,
  children,
}: PageWrapperProps) {
  const hasHeader = title || description || actions || breadcrumbs?.length;
  return (
    <Container
      size={size}
      py="lg"
      style={{
        position: "relative",
      }}
    >
      <Stack gap="lg">
        {hasHeader && (
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Group align="center" my="md">
                  <EvolveBreadcrumbs items={breadcrumbs} />
                </Group>
              )}
              {title && (
                <Flex align="center" gap="sm">
                  <Title order={1} size="h2">
                    {title}
                  </Title>
                </Flex>
              )}
              {description && (
                <Text c="dimmed" size="sm">
                  {description}
                </Text>
              )}
            </div>
            {actions}
          </Group>
        )}

        {children}
      </Stack>
    </Container>
  );
}
