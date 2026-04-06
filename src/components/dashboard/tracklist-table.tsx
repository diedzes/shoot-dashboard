import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tracklist } from "@/lib/sheets";

type TracklistTableProps = {
  tracklist: Tracklist;
};

const renderFallbackRow = (row: string[]) =>
  row.filter((cell) => cell.trim() !== "").join(" - ") || "—";

export const TracklistTable = ({ tracklist }: TracklistTableProps) => {
  if (!tracklist.available) {
    return <p className="text-base leading-[1.5] text-muted-foreground">Not available.</p>;
  }

  if (!tracklist.rows.length) {
    return <p className="text-base leading-[1.5] text-muted-foreground">No tracks found.</p>;
  }

  const headers = tracklist.headers;
  if (!headers) {
    return (
      <div className="space-y-2">
        {tracklist.rows.map((row, index) => (
          <p key={`${tracklist.packageId}-${index}`} className="text-base leading-[1.5]">
            {renderFallbackRow(row)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={`${tracklist.packageId}-head-${index}`}>
                {header || "—"}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracklist.rows.map((row, rowIndex) => (
            <TableRow key={`${tracklist.packageId}-row-${rowIndex}`}>
              {headers.map((_, cellIndex) => (
                <TableCell key={`${tracklist.packageId}-cell-${rowIndex}-${cellIndex}`}>
                  {row[cellIndex] || "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
