import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DistillForm } from "@/components/distill/DistillForm";

export default async function DistillPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  return <DistillForm user={user} />;
}
