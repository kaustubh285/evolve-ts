import { Container, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/page-wrapper";

export const Route = createFileRoute("/_authed/")({ component: Home });

function Home() {
  return (
    <PageWrapper>
      <Title order={1}>Evolve</Title>
    </PageWrapper>
  );
}
