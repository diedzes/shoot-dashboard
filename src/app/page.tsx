import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getContactsData } from "@/lib/sheets";

export const revalidate = 300;

export default async function Home() {
  const { contacts, packageIds, packageLabels, types } = await getContactsData();

  return (
    <main className="min-h-screen bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <DashboardClient
          contacts={contacts}
          packageIds={packageIds}
          packageLabels={packageLabels}
          types={types}
        />
      </div>
    </main>
  );
}
