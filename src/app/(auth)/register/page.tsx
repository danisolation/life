import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/10 p-6">
      <RegisterForm />
    </div>
  );
}
