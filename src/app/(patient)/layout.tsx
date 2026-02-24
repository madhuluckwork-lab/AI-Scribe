import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PatientHeader } from "@/components/layout/patient-header";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <PatientHeader />
      <main className="flex-1 bg-muted/30 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
