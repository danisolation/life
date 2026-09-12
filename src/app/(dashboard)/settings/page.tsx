import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { DEFAULT_HOUSEHOLD_SETTINGS, type HouseholdSettings } from "@/types";

export default async function SettingsPage() {
  const session = await requireAuth();

  const membership = await db.query.householdMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, session.user.id),
  });

  const household = membership
    ? await db.query.households.findFirst({
        where: (h, { eq }) => eq(h.id, membership.householdId),
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, household, and preferences."
      />

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback className="text-lg">
                {session.user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">
                {session.user.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {household ? (
        <SettingsForm
          name={household.name}
          currency={household.currency ?? "USD"}
          locale={household.locale ?? "en-US"}
          settings={{
            ...DEFAULT_HOUSEHOLD_SETTINGS,
            ...((household.settings ?? {}) as HouseholdSettings),
          }}
        />
      ) : (
        <Card>
          <CardContent>
            <p className="py-6 text-center text-sm text-muted-foreground">
              Setting up your household…
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="destructive" className="w-full" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
