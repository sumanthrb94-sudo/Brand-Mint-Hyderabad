import { NextResponse } from "next/server";

// Clear the cookie on the response itself so the Set-Cookie header
// definitely rides along with the redirect.
export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.set("bmos_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
