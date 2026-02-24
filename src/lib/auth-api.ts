import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function getAuthSession(req?: NextRequest) {
  // Try NextAuth session first (web/cookie)
  const session = await auth();
  if (session?.user?.id) return session;

  // Fallback to Bearer token (mobile)
  if (!req) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, SECRET);

    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      },
    };
  } catch {
    return null;
  }
}

export async function signMobileJWT(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
}) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}
