// app/account/page.tsx
import React from "react";
import { getUserDetailsById, type UserDetails } from "@/lib/actions";

import { requireUser } from "@/lib/auth-guard";
import { Cog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AccountSettingsForm } from "@/components/account/AccountSettingsForm";
import { BillingForm } from "@/components/account/billing-form";
import { SharingSettingsForm } from "@/components/account/sharing-settings-form";
import { NotificationSettingsForm } from "@/components/account/notifications-settings-form";
import { ProfilePictureUploader } from "@/components/account/ProfilePictureUploader";
import { DangerZone } from "@/components/account/dange-zone";
import { ProfileCompletion } from "@/components/account/ProfileCompletion";
import { GeneralSettings } from "@/components/account/general-settings";

export default async function AccountSettings() {
  const user = await requireUser();
  const userDetails: UserDetails = await getUserDetailsById(user.id);

  return (
    <main className="space-y-4 pb-10">
      <header className="mb-8 animate-gradient bg-linear-to-r from-sky-400 via-emerald-400 to-violet-400 bg-size-[300%_300%] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="mb-4 flex items-center gap-4 text-4xl font-bold">
            Account Settings{" "}
            <Cog
              strokeWidth={1.5}
              className="size-10 animate-spin drop-shadow-xl transition-all duration-1000 ease-in-out"
            />
          </h1>
          <p className="text-xl opacity-90">
            Manage your account preferences and settings
          </p>
        </div>
      </header>

      <Card className="container mx-auto max-w-5xl p-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            <GeneralSettings
              initialImageUrl={
                userDetails.avatarUrl
                  ? userDetails.avatarUrl
                  : userDetails.image
              }
              initialSettings={userDetails}
              userId={user.id}
            />

            <DangerZone userId={user.id} />
          </TabsContent>
          // app/account/page.tsx
          <TabsContent value="sharing" className="mt-6">
            <SharingSettingsForm
              initialSettings={userDetails.AccountSettings} // 👈 Pass .AccountSettings here!
              userId={user.id}
            />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6">
            <NotificationSettingsForm
              initialSettings={userDetails.AccountSettings} // 👈 Pass .AccountSettings here!
              userId={user.id}
            />
          </TabsContent>
          <TabsContent value="billing" className="mt-6">
            <BillingForm
              billingInfo={userDetails.BillingInformation} // 👈 Pass .BillingInformation here!
              userId={user.id}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
}
