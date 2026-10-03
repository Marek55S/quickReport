import type { Metadata } from "next";
import MyReports from "@/components/resident/MyReports";

export const metadata: Metadata = {
  title: "Moje zgłoszenia – QuickReport",
};

export default function MyReportsPage() {
  return <MyReports />;
}
