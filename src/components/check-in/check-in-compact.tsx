import { Box, Flex } from "@mantine/core";
import { timeInZone } from "#/lib/dates";
import type { CheckInRow } from "./form-context";

type CheckInCompactProps = {
	checkIn: CheckInRow | null;
	/** Zone to show times in (from getCheckIn), so server and browser render the same text. */
	timeZone: string;
};

export function CheckInCompact({ checkIn, timeZone }: CheckInCompactProps) {
	// sleepStart is already a Date — React can't render a Date, so format it to "HH:MM".
	const bed = checkIn?.sleepStart ? timeInZone(checkIn.sleepStart, timeZone) : "–";
	const wake = checkIn?.sleepEnd ? timeInZone(checkIn.sleepEnd, timeZone) : "–";

	return (
		<Box>
			<Flex>
				Sleep: {bed} → {wake}
			</Flex>
		</Box>
	);
}
