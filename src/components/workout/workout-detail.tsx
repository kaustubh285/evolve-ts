import { EntryDetail } from "#/components/entry-detail";
import { deleteWorkout } from "#/server/workout.functions";
import { WorkoutCompact, type WorkoutWithSets } from "./workout-compact";
import { WorkoutForm } from "./workout-form";

type WorkoutDetailProps = {
  workout: WorkoutWithSets;
  timeZone: string;
  /** Saved or deleted → e.g. close the modal. Omit when rendered inline. */
  onDone?: () => void;
  /** Extra buttons, e.g. a link to the day page. */
  extraActions?: React.ReactNode;
};

/** A workout's full card, with Edit (the same form as Add) and Delete. */
export function WorkoutDetail({
  workout,
  timeZone,
  onDone,
  extraActions,
}: WorkoutDetailProps) {
  return (
    <EntryDetail
      noun="workout"
      view={
        <WorkoutCompact
          workout={workout}
          timeZone={timeZone}
          linkToDay={false}
          maxExercises={Number.POSITIVE_INFINITY}
        />
      }
      renderEdit={({ done, cancel }) => (
        <WorkoutForm
          date={workout.date}
          timeZone={timeZone}
          workout={workout}
          onDone={done} // saved → close
          onCancel={cancel} // back to the read-only view
        />
      )}
      onDelete={() => deleteWorkout({ data: { id: workout.id } })}
      onDone={onDone}
      extraActions={extraActions}
    />
  );
}
