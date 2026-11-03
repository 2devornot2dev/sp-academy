// app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";

import DashboardClientLayout from "@/components/dashboard/DashboardLayout";
import { SpriteProvider } from "@/context/sprite-context";
import { requireUser, hasActiveAccess, isUser } from "@/lib/auth-guard";
import { getUserNotifications } from "@/lib/notifications";
import { getUserSprite } from "@/lib/sprites/get-user-sprite";
import { S3Provider } from "@/context/s3-context";
import { UserProvider } from "@/context/user-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const userId = user.id;
  const userData = await isUser(userId);

  const [hasAccess, spriteData, userNotifications] = await Promise.all([
    hasActiveAccess(user.id), // returns true for admins
    getUserSprite(user.id),
    getUserNotifications(user.id),
  ]);

  if (!hasAccess) {
    redirect("/verify?type=subscription-required");
  }

  if (!userData) {
    redirect("/sign-in");
  }

  return (
 <UserProvider user={userData}>
      <SpriteProvider spriteData={spriteData}>
        <S3Provider>
          <DashboardClientLayout isAdmin={isAdmin} userData={userData} notifications={userNotifications}>
            {children}
          </DashboardClientLayout>
        </S3Provider>
      </SpriteProvider>
    </UserProvider>
  );
}


//  <UserProvider user={userData}>
//       <SpriteProvider initialSprite={spriteData}>
//         <S3Provider>
//           <DashboardClientLayout isAdmin={isAdmin}>
//             {children}
//           </DashboardClientLayout>
//         </S3Provider>
//       </SpriteProvider>
//     </UserProvider>

  //  <DashboardClientLayout isAdmin={isAdmin} userData={userData} notifications={userNotifications}>
  //     <S3Provider>
  //       <SpriteProvider spriteData={spriteData}>{children}</SpriteProvider>
  //     </S3Provider>
  //   </DashboardClientLayout>