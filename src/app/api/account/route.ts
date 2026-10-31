import { enforceRateLimit, requireUser, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Permanently deletes the signed-in account and everything linked to it. */
export const DELETE = withApiHandler(async () => {
  const user = await requireUser();
  enforceRateLimit(user.id, "account-write");

  await prisma.user.delete({ where: { id: user.id } });
  return new Response(null, { status: 204 });
});
