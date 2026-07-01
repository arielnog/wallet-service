import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/wallet"];
const authOnlyRoutes = ["/login", "/register"];

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasSession = Boolean(req.cookies.get("accessToken")?.value);

  if (protectedRoutes.includes(path) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (authOnlyRoutes.includes(path) && hasSession) {
    return NextResponse.redirect(new URL("/wallet", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/wallet", "/login", "/register"],
};
