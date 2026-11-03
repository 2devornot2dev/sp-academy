// components/account/danger-zone.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function DangerZone({ userId }: { userId: string }) {
  const handleDeleteAccount = async () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This cannot be undone.",
      )
    ) {
      // Call your API to delete the account
      await fetch(`/api/users/${userId}`, { method: "DELETE" });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          These actions are irreversible. Proceed with caution.
        </AlertDescription>
      </Alert>
      <div className="space-x-4 space-y-2">
        <Button variant="destructive" onClick={handleDeleteAccount}>
          Delete Account
        </Button>
        {/* <Button variant="outline">Export My Data</Button> */}
      </div>
    </div>
  );
}
