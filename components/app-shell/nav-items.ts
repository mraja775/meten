import type { Route } from "next";
import {
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Target,
  UserRoundPlus,
  UsersRound
} from "lucide-react";

export const navItems: Array<{
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserRoundPlus },
  { href: "/students", label: "Students", icon: UsersRound },
  { href: "/training", label: "Training", icon: Target },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings }
];
