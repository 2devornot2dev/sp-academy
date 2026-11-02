import {
  Home,
  Speech,
  ScrollText,
  BookMarked,
  GraduationCap,
  Settings,
  Gamepad,
  BookAudio,
  LayoutGrid
} from "lucide-react";


export const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutGrid strokeWidth={1.5} />,
  },
  {
    label: "Conversation",
    href: "/conversation",
    icon: <Speech strokeWidth={1.5} />,
  },
  // {
  //   label: "Courses",
  //   href: "/courses",
  //   icon: <ScrollText strokeWidth={1.5} />,
  // },
  {
    label: "Books",
    href: "/books",
    icon: <BookMarked strokeWidth={1.5} />,
  },
  {
    label: "Learning Hub",
    href: "/learning-hub",
    icon: <GraduationCap strokeWidth={1.5} />,
  },
  {
    label: "Games",
    href: "/games",
    icon: <Gamepad strokeWidth={1.5} />,
  }
  // {
  //   label: "Daily Journal",
  //   href: "/daily-journal",
  //   icon: <BookAudio strokeWidth={1.5} />
  // }
];

export const settingItems = [
  {
    label: "Account",
    href: "/account",
    icon: <Settings strokeWidth={1.5} />,
  },
];

export default { navItems, settingItems };
