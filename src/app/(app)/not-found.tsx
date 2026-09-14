import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";

export default function AppNotFound() {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="That page does not exist."
          action={
            <Button variant="outline" render={<Link href="/" />}>
              Back to overview
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
