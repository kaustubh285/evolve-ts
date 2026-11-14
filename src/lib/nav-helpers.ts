import { useLocalStorage } from "@mantine/hooks";
import { useCallback } from "react";
import { isoDate } from "#/lib/zod-schemas/common";

const RECENT_NAV_KEY = "recent_nav";
const MAX_RECENT = 5;

/** Put `item` first, drop its older copy, keep at most `max`. */
export function pushRecent<T>(list: T[], item: T, max: number): T[] {
	return [item, ...list.filter((x) => x !== item)].slice(0, max);
}

/**
 * Check-in dates you opened recently, newest first (max 5).
 * Lives in localStorage, so it's per-browser and survives reloads.
 * Every component using this hook stays in sync (Mantine broadcasts changes).
 */
export function useRecentCheckInDates() {
	const [stored, setStored] = useLocalStorage<string[]>({
		key: RECENT_NAV_KEY,
		defaultValue: [],
		// Read storage after mount: the server has no localStorage, so the first
		// render must match (empty) or hydration breaks.
		getInitialValueInEffect: true,
	});

	// Storage is user-editable; ignore anything that isn't a list of real dates.
	const dates = Array.isArray(stored)
		? stored.filter((d) => isoDate.safeParse(d).success)
		: [];

	const addDate = useCallback(
		(date: string) =>
			setStored((prev) =>
				pushRecent(Array.isArray(prev) ? prev : [], date, MAX_RECENT),
			),
		[setStored],
	);

	const clearRecent = () => {
		setStored([]);
	};

	return { dates, addDate, clearRecent };
}
