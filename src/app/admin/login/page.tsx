import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Logowanie – Panel urzędnika",
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
