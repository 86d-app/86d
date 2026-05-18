import { SignJWT, jwtVerify } from "jose";
import { getIronSession } from "iron-session";

// IMPORTANT: Token refresh uses a sliding window — the refresh token
// is rotated on every use. Old refresh tokens are immediately invalidated.
// This means retry logic must handle 401s by re-authenticating from scratch,
// NOT by retrying with the same refresh token.

export async function createToken(payload: Record<string, unknown>) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return jwtVerify(token, secret);
}
