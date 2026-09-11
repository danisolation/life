import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Life Admin OS</h1>
          <p className="text-muted-foreground">
            Your personal life operations system
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
