import { NextResponse, type NextRequest } from "next/server";
import { shouldRejectPageMethod } from "@/lib/http/pageMethodGuard";

export function middleware(request: NextRequest) {
  if (
    shouldRejectPageMethod(request.nextUrl.pathname, request.method)
  ) {
    return new NextResponse("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon\\.ico|.*\\..*).*)" ],
};
