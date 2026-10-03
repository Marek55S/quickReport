import type { Metadata } from "next";
import Dashboard from "@/components/admin/Dashboard";

export const metadata: Metadata = {
  title: "Panel urzędnika – QuickReport",
};

export default function AdminPage() {
  return <Dashboard />;
}
