import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DistillForm } from "@/components/distill/DistillForm";

export default async function DistillPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const jobs = await prisma.distillJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, tone: true, status: true, createdAt: true },
  });

  const serializedJobs = jobs.map((j) => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
  }));

  return <DistillForm user={user} jobs={serializedJobs} />;
}
