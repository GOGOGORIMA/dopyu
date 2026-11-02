import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Hash compared when the user does not exist, so response time does not reveal whether an account exists.
let dummyHash: Promise<string> | null = null;

export async function verifyPasswordOrDummy(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    dummyHash ??= bcrypt.hash("dopyu-dummy-password", BCRYPT_COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}
