import { useState } from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { FieldInfo } from "#/components/forms/fieldinfo";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/login")({
  // Already signed in? Skip the form. Runs before render, on server and client.
  beforeLoad: async () => {
    if (await getSession()) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

type Mode = "sign-in" | "sign-up";

// Better Auth's default minPasswordLength is 8; anything shorter fails server-side.
const MIN_PASSWORD = 8;

function RouteComponent() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      // Better Auth returns { data, error } instead of throwing.
      const { error } =
        mode === "sign-up"
          ? await authClient.signUp.email({
              email: value.email,
              password: value.password,
              name: value.name,
            })
          : await authClient.signIn.email({
              email: value.email,
              password: value.password,
            });

      if (error) {
        setServerError(error.message ?? "Something went wrong");
        return;
      }

      // Re-run loaders/beforeLoad so they see the new session cookie.
      await router.invalidate();
      await navigate({ to: "/" });
    },
  });

  const isSignUp = mode === "sign-up";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <p className="text-lg font-semibold">Evolve</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {isSignUp ? "Create an account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up with your email and a password."
              : "Sign in to continue."}
          </CardDescription>
        </CardHeader>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-6"
        >
          <CardContent className="flex flex-col gap-4">
            {isSignUp && (
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "Name is required" : undefined,
                }}
                children={(field) => (
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      autoComplete="name"
                      placeholder="Deshpande"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              />
            )}

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  !value
                    ? "Email is required"
                    : !/^\S+@\S+\.\S+$/.test(value)
                      ? "Enter a valid email"
                      : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={
                      field.state.meta.isTouched && !field.state.meta.isValid
                    }
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  !value
                    ? "Password is required"
                    : isSignUp && value.length < MIN_PASSWORD
                      ? `Password must be at least ${MIN_PASSWORD} characters`
                      : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={
                      field.state.meta.isTouched && !field.state.meta.isValid
                    }
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />

            {serverError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting
                    ? isSignUp
                      ? "Creating account…"
                      : "Signing in…"
                    : isSignUp
                      ? "Create account"
                      : "Sign in"}
                </Button>
              )}
            />

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isSignUp ? "sign-in" : "sign-up");
                  setServerError(null);
                }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
