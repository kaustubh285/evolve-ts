import { Burger, Flex, Group, Text } from "@mantine/core";

export function EvolveHeader({
  opened,
  toggle,
}: {
  opened: boolean;
  toggle: () => void;
}) {
  return (
    <Flex w={"100%"}>
      <Burger opened={opened} onClick={toggle} size="sm" />
      <Text
        size="lg"
        fw={700}
        style={{
          flex: 1,
        }}
      >
        Evolve
      </Text>
      <Group>
        <Text> Page 1</Text>
        <Text> Page 1</Text>
        <Text> Page 4</Text>
      </Group>
    </Flex>
  );
}
