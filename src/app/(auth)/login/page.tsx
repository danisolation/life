import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/10 p-6">
      <LoginForm />
    </div>
  );
}
