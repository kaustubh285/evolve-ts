import { Link } from "@tanstack/react-router";
import { UserMenu } from "#/components/user-menu";

type Props = {
  user: { name: string; email: string; image?: string | null };
};

export function EvolveHeader({ user }: Props) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="font-semibold">
          Evolve
        </Link>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
