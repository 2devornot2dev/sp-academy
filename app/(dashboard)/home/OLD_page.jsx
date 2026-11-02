import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  BookOpen,
  LogOut,
  Star,
  User,
  BookOpenCheck,
  Clock,
  Trophy,
} from "lucide-react";
import SpoonLogo from "@/components/SpoonLogo";
import ActivityFeed from "@/components/home/ActivityFeed";
import AchievementCard from "@/components/home/AchievementCard";
import { getUserDataByUserId } from "@/lib/actions";
import WeeklySchedule from "@/components/home/WeeklySchedule";
import RecentLessons from "@/components/home/RecentLessons";
import CurrentlyReading from "@/components/home/CurrentlyReading";
import { requireUser } from "@/lib/auth-guard";

export default async function DashboardHome() {
  const user = await requireUser();
  const userData = await getUserDataByUserId(user.id);
  const books = userData.Book;
  const achievements = userData.UserProgress;
  const progress = userData.Progress;

  // await updateAllBooksProgress();
  if (!user) {
    null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <SpoonLogo />
        <header className="mb-6 border-b bg-white p-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="mt-4 inline-block bg-linear-to-r from-blue-600 via-green-500 to-indigo-400 bg-clip-text text-4xl font-bold text-transparent">
              Welcome back, {user?.firstName}!
            </h1>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="mx-auto max-w-7xl space-y-6 px-2.5 md:px-6">
          {/* Stats Overview */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <BookOpenCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed Lessons</p>
                    <h3 className="text-2xl font-bold">24</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Study Hours</p>
                    <h3 className="text-2xl font-bold">48.5</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gdri transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-purple-100 p-3">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Achievements</p>
                    <h3 className="text-2xl font-bold">
                      {achievements.filter((a) => a.isUnlocked).length}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Recent Lessons */}
            <RecentLessons progress={progress} />
            {/* Weekly Schedule */}
            <WeeklySchedule />

            <AchievementCard achievements={achievements} />

            {/* Current Reading */}
            <CurrentlyReading books={books} />
          </div>

          {/* Activity Feed Section */}
          <div className="mt-6 pb-6">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50">
                <CardTitle className="text-lg font-semibold">
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <ActivityFeed />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
