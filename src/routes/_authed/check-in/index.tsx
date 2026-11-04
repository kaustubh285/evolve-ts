import { Box } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/check-in/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Box>Hello "/check-in/"!</Box>;
}
