import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  const { registered } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Life Admin OS</h1>
          <p className="text-muted-foreground">
            Your personal life operations system
          </p>
        </div>
        {registered === "true" && (
          <p
            role="status"
            className="rounded-lg bg-success-muted px-4 py-3 text-sm text-success-muted-foreground"
          >
            Account created. Sign in to continue.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
