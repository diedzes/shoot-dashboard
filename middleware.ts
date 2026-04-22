import { NextRequest, NextResponse } from "next/server";

const MAINTENANCE_MODE = true;
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "admin";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;

const unauthorizedResponse = () =>
  new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Shoot Music Dashboard"',
    },
  });

const maintenanceResponse = () =>
  new NextResponse("Temporarily offline for maintenance.", {
    status: 503,
    headers: {
      "Retry-After": "3600",
      "Cache-Control": "no-store",
    },
  });

export function middleware(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    return maintenanceResponse();
  }

  if (!BASIC_AUTH_PASSWORD) {
    return new NextResponse("BASIC_AUTH_PASSWORD is not set.", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const base64Credentials = authHeader.slice("Basic ".length);
  const decoded = atob(base64Credentials);
  const separatorIndex = decoded.indexOf(":");
  const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

  if (username !== BASIC_AUTH_USERNAME || password !== BASIC_AUTH_PASSWORD) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}
