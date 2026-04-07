import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TracklistTable } from "@/components/dashboard/tracklist-table";
import { getContactsData, getPackageTracklist } from "@/lib/sheets";

export const revalidate = 300;

type PackagePageProps = {
  params: { packageId: string };
};

const getPackageLabel = (packageLabels: Record<string, string>, packageId: string) =>
  packageLabels[packageId] ? `${packageId} - ${packageLabels[packageId]}` : packageId;

const formatValue = (value: string | null) => value?.trim() || "—";

const getLatestPackageQuote = (contact: { quotes: { text: string; date: string | null; packageId: string | null }[] }, packageId: string) => {
  const packageQuotes = contact.quotes.filter((quote) => quote.packageId === packageId);
  if (packageQuotes.length === 0) return null;
  return packageQuotes.reduce((latest, current) => {
    const latestTime = latest.date ? Date.parse(latest.date) : 0;
    const currentTime = current.date ? Date.parse(current.date) : 0;
    if (Number.isNaN(latestTime) && Number.isNaN(currentTime)) return latest;
    if (Number.isNaN(latestTime)) return current;
    if (Number.isNaN(currentTime)) return latest;
    return currentTime >= latestTime ? current : latest;
  }).text;
};

export default async function PackagePage({ params }: PackagePageProps) {
  const { packageId } = params;
  const { contacts, packageLabels } = await getContactsData();
  const tracklist = await getPackageTracklist(packageId);

  const recipients = contacts.filter((contact) =>
    contact.packagesSent.includes(packageId)
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base leading-[1.5] text-muted-foreground">Package detail</p>
            <h1 className="[font-family:var(--font-heading-display)] text-4xl font-extrabold uppercase tracking-wide md:text-5xl">
              Package {getPackageLabel(packageLabels, packageId)}
            </h1>
          </div>
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tracklist</CardTitle>
          </CardHeader>
          <CardContent>
            <TracklistTable tracklist={tracklist} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Responded</TableHead>
                    <TableHead>Quote</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{formatValue(contact.contact)}</TableCell>
                      <TableCell>{formatValue(contact.organization)}</TableCell>
                      <TableCell>
                        {contact.responded === null ? (
                          "—"
                        ) : (
                          <Badge variant={contact.responded ? "default" : "secondary"}>
                            {contact.responded ? "Yes" : "No"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        {formatValue(getLatestPackageQuote(contact, packageId))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {recipients.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No recipients found for this package.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
