/**
 * Generate a unique patient number in MSMC-{year}-{random5}{last3ms} format.
 * Collisions are extremely unlikely (90k x 1k = 90M combinations per year),
 * but callers should still handle Prisma unique constraint errors by retrying.
 */
export async function generatePatientNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  const suffix = Date.now().toString().slice(-3);
  return `MSMC-${year}-${random}${suffix}`;
}
