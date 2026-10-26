import {
  ArrowLeft,
  Dumbbell,
  HeartPulse,
  type LucideIcon,
  Moon,
  Plus,
  Wallet,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { HealthEventEditor } from "#/components/entries/health-event-editor";
import { HEALTH_EVENT_LABELS } from "#/components/entries/health-event-format";
import { TransactionEditor } from "#/components/entries/transaction-editor";
import {
  categoryLabel,
  formatMoney,
} from "#/components/entries/transaction-format";
import { Button } from "#/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "#/components/ui/drawer";
import { Input } from "#/components/ui/input";
import { formatIso, todayIso } from "#/lib/dates";
import { cn } from "#/lib/utils";

type Kind = "expense" | "health" | "sleep" | "workout";

const KINDS: {
  kind: Kind;
  label: string;
  icon: LucideIcon;
  ink: string;
  ready: boolean;
}[] = [
  {
    kind: "expense",
    label: "Expense",
    icon: Wallet,
    ink: "text-money",
    ready: true,
  },
  {
    kind: "health",
    label: "Health event",
    icon: HeartPulse,
    ink: "text-health",
    ready: true,
  },
  {
    kind: "sleep",
    label: "Sleep",
    icon: Moon,
    ink: "text-sleep",
    ready: false,
  },
  {
    kind: "workout",
    label: "Workout",
    icon: Dumbbell,
    ink: "text-workout",
    ready: false,
  },
];

/**
 * Floating "+" → bottom drawer → pick what to record → the same standalone
 * editor the check-in page uses, pre-set to today. Lives in the _authed
 * layout, so it's on every signed-in page.
 */
export function QuickAdd({ timeZone }: { timeZone: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [date, setDate] = useState(() => todayIso(timeZone));
  const [flash, setFlash] = useState<string | null>(null);
  const dateId = useId();

  // Every open starts fresh: chooser screen, today's date (the app may have
  // stayed open past midnight).
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setKind(null);
      setDate(todayIso(timeZone));
    }
  }

  function done(message: string) {
    setOpen(false);
    setFlash(message);
  }

  // Confirmation pill disappears on its own.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  const current = KINDS.find((k) => k.kind === kind);

  return (
    <>
      {flash && (
        <output className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-40 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {flash}
        </output>
      )}

      <button
        type="button"
        aria-label="Record something"
        onClick={() => handleOpenChange(true)}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95 sm:right-6"
      >
        <Plus className="size-6" />
      </button>

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <div className="mx-auto flex max-h-[80dvh] w-full max-w-lg flex-col">
            <DrawerHeader className="flex-row items-center gap-2 text-left">
              {current && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Back"
                  onClick={() => setKind(null)}
                >
                  <ArrowLeft />
                </Button>
              )}
              <DrawerTitle className="flex-1">
                {current ? current.label : "What do you want to record?"}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Quickly add an entry for a day.
              </DrawerDescription>
              <label htmlFor={dateId} className="sr-only">
                Date
              </label>
              <Input
                id={dateId}
                type="date"
                value={date}
                max={todayIso(timeZone)}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-8 w-auto text-sm"
              />
            </DrawerHeader>

            <div className="overflow-y-auto px-4 pb-6">
              {!current && (
                <div className="grid grid-cols-2 gap-2">
                  {KINDS.map(({ kind: k, label, icon: Icon, ink, ready }) => (
                    <button
                      key={k}
                      type="button"
                      disabled={!ready}
                      onClick={() => setKind(k)}
                      className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon className={cn("size-5", ink)} />
                      <span className="font-medium">{label}</span>
                      {!ready && (
                        <span className="text-xs text-muted-foreground">
                          Coming soon
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {kind === "expense" && (
                <TransactionEditor
                  date={date}
                  onDone={(t) =>
                    done(
                      `${formatMoney(t)} ${categoryLabel(t.category) ?? ""} · ${formatIso(t.date)}`,
                    )
                  }
                />
              )}

              {kind === "health" && (
                <HealthEventEditor
                  date={date}
                  timeZone={timeZone}
                  onDone={(e) =>
                    done(
                      `${HEALTH_EVENT_LABELS[e.type]} · ${formatIso(e.date)}`,
                    )
                  }
                />
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
