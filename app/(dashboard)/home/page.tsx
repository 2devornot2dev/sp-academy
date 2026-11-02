import { redirect } from "next/navigation";
import { getHomeDashboardData } from "@/app/actions/get-home-dashboard";
import { NewDashboardPage } from "@/components/home/new-dashboard-page";

export default async function HomePage() {
  const data = await getHomeDashboardData();
  if (!data) redirect("/sign-in");

  return <NewDashboardPage data={data} />;
}