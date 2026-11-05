import { Burger, Flex, Group, Text, Title } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";

export function EvolveHeader({
  opened,
  toggle,
}: {
  opened: boolean;
  toggle: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Flex w={"100%"} align={"center"}>
      <Burger opened={opened} onClick={toggle} size="sm" />
      <Title
        order={2}
        fw={700}
        pl={"sm"}
        style={{
          flex: 1,
          cursor: "pointer",
        }}
        onClick={() => navigate({ to: "/" })}
      >
        Evolve
      </Title>
      <Group>
        <Text
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/check-in" })}
        >
          Check-in
        </Text>
        <Text
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/" })}
        >
          {" "}
          Page 1
        </Text>
        <Text
          style={{ cursor: "pointer" }}
          onClick={() => navigate({ to: "/" })}
        >
          {" "}
          Page 4
        </Text>
      </Group>
    </Flex>
  );
}
