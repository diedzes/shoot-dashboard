import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getContactsData } from "@/lib/sheets";

export const revalidate = 300;

export default async function Home() {
  const { contacts, packageIds, packageLabels, types } = await getContactsData();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
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
