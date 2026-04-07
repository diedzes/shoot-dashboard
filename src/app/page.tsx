import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getContactsData } from "@/lib/sheets";

export const revalidate = 300;

export default async function Home() {
  const { contacts, packageIds, packageLabels, types } = await getContactsData();
  const deployCommit = process.env.VERCEL_GIT_COMMIT_SHA;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        <DashboardClient
          contacts={contacts}
          packageIds={packageIds}
          packageLabels={packageLabels}
          types={types}
        />
        {deployCommit ? (
          <p className="text-center text-xs leading-[1.5] text-muted-foreground">
            Build {deployCommit.slice(0, 7)}
          </p>
        ) : null}
      </div>
    </main>
  );
}
