import { NextResponse } from "next/server";
import { getPackageTracklist } from "@/lib/sheets";

export const GET = async (
  _request: Request,
  context: { params: Promise<{ packageId: string }> }
) => {
  const { packageId } = await context.params;
  const tracklist = await getPackageTracklist(packageId);
  return NextResponse.json(tracklist);
};
