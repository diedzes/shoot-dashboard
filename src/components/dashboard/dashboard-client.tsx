"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TracklistTable } from "@/components/dashboard/tracklist-table";
import type { ContactRow, QuoteEntry, Tracklist } from "@/lib/sheets";

type DashboardClientProps = {
  contacts: ContactRow[];
  packageIds: string[];
  packageLabels: Record<string, string>;
  types: string[];
};

const getPackageLabel = (packageLabels: Record<string, string>, packageId: string) =>
  packageLabels[packageId] ? `${packageId} - ${packageLabels[packageId]}` : packageId;

const formatValue = (value: string | null) => value?.trim() || "—";

const formatQuoteDate = (value: string | null) => value?.trim() || "Undated";

const sortQuotesNewestFirst = (quotes: QuoteEntry[]) =>
  [...quotes].sort((a, b) => {
    const aTime = a.date ? Date.parse(a.date) : 0;
    const bTime = b.date ? Date.parse(b.date) : 0;
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });

const csvEscape = (value: string) => {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
};

export const DashboardClient = ({
  contacts,
  packageIds,
  packageLabels,
  types,
}: DashboardClientProps) => {
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [responseFilter, setResponseFilter] = useState<string>("all");
  const [quoteOnly, setQuoteOnly] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [dialogPackage, setDialogPackage] = useState<string>("");
  const [tracklist, setTracklist] = useState<Tracklist | null>(null);
  const [tracklistLoading, setTracklistLoading] = useState(false);
  const [contentTracklist, setContentTracklist] = useState<Tracklist | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (packageFilter !== "all" && !contact.packagesSent.includes(packageFilter)) {
        return false;
      }
      if (typeFilter !== "all" && contact.type !== typeFilter) {
        return false;
      }
      if (responseFilter === "responded" && contact.responded !== true) {
        return false;
      }
      if (responseFilter === "not-responded" && contact.responded !== false) {
        return false;
      }
      if (quoteOnly && !contact.quote) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack = [
        contact.contact,
        contact.organization,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [contacts, packageFilter, query, quoteOnly, responseFilter, typeFilter]);

  const totals = useMemo(() => {
    const total = filteredContacts.length;
    const withPackages = filteredContacts.filter((contact) => contact.packagesSent.length > 0)
      .length;
    const responded = filteredContacts.filter((contact) => contact.responded === true).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    return {
      total,
      withPackages,
      responded,
      responseRate,
    };
  }, [filteredContacts]);

  const openDialog = (contact: ContactRow) => {
    setSelectedContact(contact);
    const preferred =
      packageFilter !== "all" && contact.packagesSent.includes(packageFilter)
        ? packageFilter
        : contact.packagesSent[0] || "";
    setDialogPackage(preferred);
    setDialogOpen(true);
  };

  useEffect(() => {
    const loadTracklist = async () => {
      if (!dialogOpen || !dialogPackage) {
        setTracklist(null);
        return;
      }
      setTracklistLoading(true);
      try {
        const response = await fetch(`/api/packages/${dialogPackage}`);
        const data = (await response.json()) as Tracklist;
        setTracklist(data);
      } catch (error) {
        console.error("Tracklist fetch failed", error);
        setTracklist({
          packageId: dialogPackage,
          available: false,
          headers: null,
          rows: [],
        });
      } finally {
        setTracklistLoading(false);
      }
    };
    loadTracklist();
  }, [dialogOpen, dialogPackage]);

  useEffect(() => {
    const loadContent = async () => {
      if (packageFilter === "all") {
        setContentTracklist(null);
        return;
      }
      setContentLoading(true);
      try {
        const response = await fetch(`/api/packages/${packageFilter}`);
        const data = (await response.json()) as Tracklist;
        setContentTracklist(data);
      } catch (error) {
        console.error("Package content fetch failed", error);
        setContentTracklist({
          packageId: packageFilter,
          available: false,
          headers: null,
          rows: [],
        });
      } finally {
        setContentLoading(false);
      }
    };
    loadContent();
  }, [packageFilter]);

  return (
    <div className="space-y-16 md:space-y-24">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <h1 className="[font-family:var(--font-heading-display)] max-w-xl text-4xl font-extrabold uppercase tracking-wide md:text-5xl">
            Shoot Music NL/BE Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <img
              src="https://burobros.nl/klanten/sportsounds/wp-content/uploads/2026/02/Sport-sounds-Logo-zwart-scaled.png"
              alt="Sport Sounds"
              className="h-[64px] w-auto object-contain"
            />
            <img
              src="https://burobros.nl/klanten/sportsounds/wp-content/uploads/2026/02/Shoot-Logo-ORIGINAL-scaled-1.jpg"
              alt="Shoot Music"
              className="h-[72px] w-auto object-contain"
            />
          </div>
        </div>
        <p className="max-w-2xl text-base leading-[1.5] text-muted-foreground">
          Overview of sent music packages, responses, and quotes.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <p className="text-sm font-medium leading-[1.5] text-foreground">Package</p>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All packages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All packages</SelectItem>
                {packageIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {getPackageLabel(packageLabels, id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium leading-[1.5] text-foreground">Organization type</p>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium leading-[1.5] text-foreground">Response status</p>
            <Select value={responseFilter} onValueChange={setResponseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="responded">Responded only</SelectItem>
                <SelectItem value="not-responded">Not responded only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <Switch
              checked={quoteOnly}
              onCheckedChange={setQuoteOnly}
              id="quote-only"
            />
            <label htmlFor="quote-only" className="text-sm font-medium leading-[1.5] text-foreground">
              Quotes only
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium leading-[1.5] text-foreground">Search</p>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Contact or organization"
            />
          </div>
        </CardContent>
      </Card>

      {packageFilter !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle>Package content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing the tracklist for {getPackageLabel(packageLabels, packageFilter)}.
            </p>
            {contentLoading ? (
              <p className="text-sm text-muted-foreground">Loading tracklist...</p>
            ) : contentTracklist ? (
              <TracklistTable tracklist={contentTracklist} />
            ) : null}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Packages sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.withPackages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Responded</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.responded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.responseRate}%</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Packages</TableHead>
                  <TableHead>Responded</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{formatValue(contact.contact)}</TableCell>
                    <TableCell>{formatValue(contact.type)}</TableCell>
                    <TableCell>{formatValue(contact.organization)}</TableCell>
                    <TableCell>
                      {contact.packagesSent.length ? (
                        <div className="flex flex-wrap gap-2">
                          {contact.packagesSent.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => openDialog(contact)}
                              className="text-base font-medium text-primary underline underline-offset-2"
                            >
                              {getPackageLabel(packageLabels, id)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.responded === null ? (
                        "—"
                      ) : (
                        <Badge variant={contact.responded ? "default" : "secondary"}>
                          {contact.responded ? "Yes" : "No"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <QuoteCell quote={contact.quote} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openDialog(contact)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredContacts.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No results.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contact details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium">{formatValue(selectedContact.contact)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Organization</p>
                  <p className="text-sm font-medium">{formatValue(selectedContact.organization)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{formatValue(selectedContact.type)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Responded</p>
                  <p className="text-sm font-medium">
                    {selectedContact.responded === null
                      ? "—"
                      : selectedContact.responded
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Packages</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.packagesSent.length ? (
                      selectedContact.packagesSent.map((id) => (
                        <Badge key={id} variant="secondary">
                          {getPackageLabel(packageLabels, id)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Quote</p>
                {selectedContact.quotes.length > 0 ? (
                  <div className="space-y-3">
                    {sortQuotesNewestFirst(selectedContact.quotes).map((entry, index) => (
                      <div key={`${selectedContact.id}-quote-${index}`} className="space-y-1">
                        <p className="text-xs uppercase text-muted-foreground">
                          {formatQuoteDate(entry.date)}
                          {entry.packageId
                            ? ` · ${getPackageLabel(packageLabels, entry.packageId)}`
                            : ""}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Tracklist</p>
                    <p className="text-sm">
                      {dialogPackage
                        ? `Package ${getPackageLabel(packageLabels, dialogPackage)}`
                        : "No package selected"}
                    </p>
                  </div>
                  <Select value={dialogPackage} onValueChange={setDialogPackage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContact.packagesSent.map((id) => (
                        <SelectItem key={id} value={id}>
                          {getPackageLabel(packageLabels, id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {dialogPackage ? (
                  tracklistLoading ? (
                    <p className="text-sm text-muted-foreground">Loading tracklist...</p>
                  ) : tracklist ? (
                    <TracklistTable tracklist={tracklist} />
                  ) : null
                ) : (
                  <p className="text-sm text-muted-foreground">No package to show.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const QuoteCell = ({ quote }: { quote: string | null }) => {
  if (!quote) {
    return <span className="text-base leading-[1.5] text-muted-foreground">—</span>;
  }
  return <span className="text-base leading-[1.5] whitespace-pre-wrap">{quote}</span>;
};
