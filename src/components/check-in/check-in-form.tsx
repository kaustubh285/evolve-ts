import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { FormSection } from "#/components/form-section";
import type { HealthEventRow } from "#/components/health/health-event-compact";
import { HealthEventCompact } from "#/components/health/health-event-compact";
import { HealthEventForm } from "#/components/health/health-event-form";
import { LinkActionIcon, LinkButton } from "#/components/links";
import type { WorkoutWithSets } from "#/components/workout/workout-compact";
import { WorkoutCompact } from "#/components/workout/workout-compact";
import { WorkoutForm } from "#/components/workout/workout-form";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { checkInInput } from "#/lib/zod-schemas/check-in";
import { saveCheckIn } from "#/server/check-in.functions";
import { DayEntries, type DayEntryModal } from "./day-entries";
import { FoodFields } from "./food-fields";
import {
	CheckInFormProvider,
	type CheckInFormValues,
	type CheckInRow,
	toFormValues,
	toServerValues,
	useCheckInForm,
} from "./form-context";
import { HealthFields } from "./health-fields";
import { SleepFields } from "./sleep-fields";

type CheckInFormProps = {
	date: string;
	checkIn: CheckInRow | null;
	/** Zone the sleep times are shown in (from getCheckIn). */
	timeZone: string;
	/** Same-day workouts and health events (linked by date, from getCheckIn). */
	workouts: WorkoutWithSets[];
	healthEvents: HealthEventRow[];
};

const MODAL_TITLES: Record<DayEntryModal["kind"], string> = {
	"add-workout": "Add workout",
	"add-health": "Log health event",
	workout: "Workout",
	health: "Health event",
};

type SaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "saved" }
	| { kind: "error"; message: string };

export function CheckInForm({
	date,
	checkIn,
	timeZone,
	workouts,
	healthEvents,
}: CheckInFormProps) {
	const router = useRouter();
	const [save, setSave] = useState<SaveState>({ kind: "idle" });
	const [modal, setModal] = useState<DayEntryModal | null>(null);
	const closeModal = () => setModal(null);
	// Forms in a modal are cramped on a phone → full screen there.
	const isMobile = useMediaQuery("(max-width: 48em)");
	const form = useCheckInForm({
		initialValues: toFormValues(checkIn, timeZone),
		// Editing after a save clears "Saved" so the status never lies.
		onValuesChange: () =>
			setSave((s) => (s.kind === "saved" ? { kind: "idle" } : s)),
	});

	/** Validates and saves. Resolves true when the check-in is safely stored. */
	async function handleSubmit(values: CheckInFormValues): Promise<boolean> {
		// Same zod schema as the server; its paths (sleepStart, sleepEnd, …)
		// match the form's field names, so errors land on the right input.
		const parsed = checkInInput.safeParse(
			toServerValues(values, date, timeZone),
		);
		if (!parsed.success) {
			for (const issue of parsed.error.issues) {
				form.setFieldError(String(issue.path[0]), issue.message);
			}
			setSave({ kind: "error", message: "Fix the highlighted fields" });
			return false;
		}

		setSave({ kind: "saving" });
		try {
			await saveCheckIn({ data: parsed.data });
			form.resetDirty(values);
			setSave({ kind: "saved" });
			router.invalidate(); // refresh loaders that show this check-in
			return true;
		} catch (e) {
			setSave({
				kind: "error",
				message: e instanceof Error ? e.message : "Couldn't save",
			});
			return false;
		}
	}

	// Cmd/Ctrl+S saves. Allowed while typing in inputs (empty ignore list).
	// Not while a modal is open — you'd be typing in the workout/health form, not this one.
	useHotkeys(
		[["mod+S", () => modal === null && handleSubmit(form.getValues())]],
		[],
	);

	// For every link that leaves this form (day arrows, add workout, log health event):
	// with unsaved edits, hold the navigation, save first, and only follow the link
	// if saving worked — invalid fields keep you here instead of losing the edits.
	async function saveThenFollow(e: React.MouseEvent) {
		if (!form.isDirty()) return; // nothing to save → plain link
		const href = e.currentTarget.getAttribute("href");
		if (!href) return;
		e.preventDefault();
		if (await handleSubmit(form.getValues())) router.navigate({ href });
	}

	const isFuture = date > todayIso(timeZone); // ISO strings sort by date

	return (
		<CheckInFormProvider form={form}>
			<form onSubmit={form.onSubmit(handleSubmit)} noValidate>
				<Stack gap="xl">
					<Group justify="space-between" wrap="nowrap">
						<Group gap={4} wrap="nowrap">
							<LinkActionIcon
								to="/check-in/$date"
								params={{ date: addDays(date, -1) }}
								variant="subtle"
								color="gray"
								aria-label="Previous day"
								onClick={saveThenFollow}
							>
								<ChevronLeft size={18} />
							</LinkActionIcon>
							<Stack gap={0} miw={96} align="center">
								<Text fw={600} c={isFuture ? "rust" : undefined}>
									{formatIso(date)}
								</Text>
								{isFuture && (
									<Text size="xs" c="rust" lh={1}>
										Future
									</Text>
								)}
							</Stack>
							<LinkActionIcon
								to="/check-in/$date"
								params={{ date: addDays(date, 1) }}
								variant="subtle"
								color="gray"
								aria-label="Next day"
								onClick={saveThenFollow}
							>
								<ChevronRight size={18} />
							</LinkActionIcon>
						</Group>
						<Group gap="sm" wrap="nowrap">
							{/* Read out by screen readers when it changes. */}
							<Text
								size="sm"
								c={save.kind === "error" ? "red" : "dimmed"}
								role="status"
								aria-live="polite"
							>
								{save.kind === "saving" && "Saving…"}
								{save.kind === "saved" && "Saved"}
								{save.kind === "error" && save.message}
							</Text>
							<Button
								type="submit"
								loading={save.kind === "saving"}
								aria-keyshortcuts="Control+S Meta+S"
							>
								Save
							</Button>
						</Group>
					</Group>

					<FormSection
						title="Sleep"
						description="Last night, ending this morning"
					>
						<SleepFields />
					</FormSection>
					<FormSection title="Food">
						<FoodFields />
					</FormSection>
					<FormSection title="Health & others">
						{/* Between steps and notes. */}
						<HealthFields>
							<DayEntries
								workouts={workouts}
								healthEvents={healthEvents}
								timeZone={timeZone}
								onOpen={setModal}
							/>
						</HealthFields>
					</FormSection>
				</Stack>
			</form>

			{/*
        Outside the <form> on purpose: React bubbles events through portals along the
        component tree, so a workout form submitted inside a modal rendered within this
        <form> would also submit the check-in.
      */}
			<Modal
				opened={modal !== null}
				onClose={closeModal}
				title={modal && MODAL_TITLES[modal.kind]}
				size="lg"
				fullScreen={isMobile}
			>
				{modal?.kind === "add-workout" && (
					<WorkoutForm date={date} timeZone={timeZone} onDone={closeModal} />
				)}
				{modal?.kind === "add-health" && (
					<HealthEventForm
						date={date}
						timeZone={timeZone}
						onDone={closeModal}
					/>
				)}
				{modal?.kind === "workout" && (
					<Stack gap="md">
						<WorkoutCompact
							workout={modal.workout}
							timeZone={timeZone}
							linkToDay={false}
							maxExercises={Number.POSITIVE_INFINITY}
						/>
						<Group justify="flex-end">
							<LinkButton
								to="/workout/$date"
								params={{ date }}
								variant="subtle"
								onClick={saveThenFollow}
							>
								Open workouts for this day
							</LinkButton>
						</Group>
					</Stack>
				)}
				{modal?.kind === "health" && (
					<Stack gap="md">
						<HealthEventCompact
							event={modal.event}
							timeZone={timeZone}
							linkToDay={false}
						/>
						<Group justify="flex-end">
							<LinkButton
								to="/health/$date"
								params={{ date }}
								variant="subtle"
								onClick={saveThenFollow}
							>
								Open health for this day
							</LinkButton>
						</Group>
					</Stack>
				)}
			</Modal>
			<Group gap="sm" wrap="nowrap" justify="end">
				{/* Read out by screen readers when it changes. */}
				<Text
					size="sm"
					c={save.kind === "error" ? "red" : "dimmed"}
					role="status"
					aria-live="polite"
				>
					{save.kind === "saving" && "Saving…"}
					{save.kind === "saved" && "Saved"}
					{save.kind === "error" && save.message}
				</Text>
				<Button
					type="submit"
					size="compact-md"
					w={"20%"}
					loading={save.kind === "saving"}
					aria-keyshortcuts="Control+S Meta+S"
				>
					Save
				</Button>
			</Group>
		</CheckInFormProvider>
	);
}
