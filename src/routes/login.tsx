import {
	Alert,
	Anchor,
	Button,
	Center,
	Paper,
	PasswordInput,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({
	// Already signed in? Skip the form. Runs before render, on server and client.
	beforeLoad: async () => {
		if (await getSession()) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});

// Better Auth's default minPasswordLength is 8; anything shorter fails server-side.
const MIN_PASSWORD = 8;

// `mode` lives in the form values, so one schema can switch rules:
// sign-up needs a name and a longer password, sign-in doesn't.
const loginSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("sign-in"),
		email: z.email("Enter a valid email"),
		password: z.string().min(1, "Password is required"),
		name: z.string(),
	}),
	z.object({
		mode: z.literal("sign-up"),
		email: z.email("Enter a valid email"),
		password: z
			.string()
			.min(MIN_PASSWORD, `At least ${MIN_PASSWORD} characters`),
		name: z.string().trim().min(1, "Name is required"),
	}),
]);

type LoginValues = z.infer<typeof loginSchema>;

function LoginPage() {
	const router = useRouter();
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<LoginValues>({
		initialValues: { mode: "sign-in", email: "", password: "", name: "" },
		// Same zod schema style as everywhere else; Mantine maps issues to fields.
		validate: schemaResolver(loginSchema, { sync: true }),
		validateInputOnBlur: true,
	});

	const isSignUp = form.values.mode === "sign-up";

	async function handleSubmit(values: LoginValues) {
		setServerError(null);
		// Better Auth returns { data, error } instead of throwing.
		const { email, password, name } = values;
		const { error } =
			values.mode === "sign-up"
				? await authClient.signUp.email({ email, password, name })
				: await authClient.signIn.email({ email, password });

		if (error) {
			setServerError(error.message ?? "Something went wrong");
			return;
		}
		// Re-run loaders/beforeLoad so they see the new session cookie.
		await router.invalidate();
		await navigate({ to: "/" });
	}

	return (
		<Center mih="100vh" px="md" py="xl">
			<Stack w="100%" maw={384} gap="lg">
				<Text ta="center" fw={700} size="lg">
					Evolve
				</Text>

				<Paper withBorder shadow="xs" p="lg">
					{/* form.onSubmit validates first; handleSubmit only runs if valid. */}
					<form onSubmit={form.onSubmit(handleSubmit)} noValidate>
						<Stack gap="md">
							<div>
								<Title order={2} size="h3">
									{isSignUp ? "Create an account" : "Welcome back"}
								</Title>
								<Text size="sm" c="dimmed">
									{isSignUp
										? "Sign up with your email and a password."
										: "Sign in to continue."}
								</Text>
							</div>

							{isSignUp && (
								<TextInput
									label="Name"
									autoComplete="name"
									{...form.getInputProps("name")}
								/>
							)}
							<TextInput
								label="Email"
								type="email"
								autoComplete="email"
								placeholder="you@example.com"
								{...form.getInputProps("email")}
							/>
							<PasswordInput
								label="Password"
								autoComplete={isSignUp ? "new-password" : "current-password"}
								{...form.getInputProps("password")}
							/>

							{serverError && (
								<Alert color="red" variant="light" p="xs">
									{serverError}
								</Alert>
							)}

							<Button type="submit" fullWidth loading={form.submitting}>
								{isSignUp ? "Create account" : "Sign in"}
							</Button>

							<Text size="sm" c="dimmed" ta="center">
								{isSignUp
									? "Already have an account?"
									: "Don't have an account?"}{" "}
								<Anchor
									component="button"
									type="button"
									fw={600}
									onClick={() => {
										form.setFieldValue(
											"mode",
											isSignUp ? "sign-in" : "sign-up",
										);
										form.clearErrors();
										setServerError(null);
									}}
								>
									{isSignUp ? "Sign in" : "Sign up"}
								</Anchor>
							</Text>
						</Stack>
					</form>
				</Paper>
			</Stack>
		</Center>
	);
}
