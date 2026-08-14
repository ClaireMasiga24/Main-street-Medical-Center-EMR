const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Find patients in referred statuses that might need to return to the doctor
  const stuck = await prisma.patient.findMany({
    where: {
      currentStatus: {
        in: ["AWAITING_LAB", "AWAITING_SONOGRAPHY", "AWAITING_RADIOLOGY", "AWAITING_DENTIST"],
      },
    },
    select: {
      id: true, patientNumber: true, firstName: true, lastName: true, currentStatus: true, updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  console.log(JSON.stringify(stuck, null, 2));
  console.log(`\nTotal stuck patients: ${stuck.length}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
