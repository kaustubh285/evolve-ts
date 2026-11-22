import { EntryDetail } from "#/components/entry-detail";
import { deleteHealthEvent } from "#/server/health-event.functions";
import {
  HealthEventCompact,
  type HealthEventRow,
} from "./health-event-compact";
import { HealthEventForm } from "./health-event-form";

type HealthEventDetailProps = {
  event: HealthEventRow;
  timeZone: string;
  /** Saved or deleted → e.g. close the modal. Omit when rendered inline. */
  onDone?: () => void;
  /** Extra buttons, e.g. a link to the day page. */
  extraActions?: React.ReactNode;
};

/** A health event's card, with Edit (the same form as Add) and Delete. */
export function HealthEventDetail({
  event,
  timeZone,
  onDone,
  extraActions,
}: HealthEventDetailProps) {
  return (
    <EntryDetail
      noun="health event"
      view={
        <HealthEventCompact
          event={event}
          timeZone={timeZone}
          linkToDay={false}
        />
      }
      renderEdit={({ done, cancel }) => (
        <HealthEventForm
          date={event.date}
          timeZone={timeZone}
          event={event}
          onDone={done} // saved → close
          onCancel={cancel} // back to the read-only view
        />
      )}
      onDelete={() => deleteHealthEvent({ data: { id: event.id } })}
      onDone={onDone}
      extraActions={extraActions}
    />
  );
}
