import { PrismaClient } from "@prisma/client";
import { remainingDrugs } from "./seed-data";
import { remainingDrugs2 } from "./seed-data2";
import { remainingDrugs3 } from "./seed-data3";
import { remainingDrugs4 } from "./seed-data4";
import { remainingDrugs5 } from "./seed-data5";

const prisma = new PrismaClient();

interface DrugRow {
  itemCode: string;
  name: string;
  buyingCost: number;
  category: string;
  costCentre: string;
  sellingPrice: number;
  customPrices: string | null;
  lastEditedOn: string;
  lastEditedBy: string;
  registeredOn: string;
}

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
  console.log("Starting drug seed...");

  // Check if drugs already exist
  const existingCount = await prisma.drug.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} drugs. Skipping seed.`);
    return;
  }

  // The full drug catalog from Main Street Medical Center
  // Parsed from the hospital's CSV price list
  const drugs: DrugRow[] = [
    { itemCode: "DRG0235", name: "Bromocriptine tablets 2.5mg", buyingCost: 583.3, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-27 11:46:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0391", name: "Biodon syrup 125ml", buyingCost: 9500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 35000, customPrices: null, lastEditedOn: "2026-06-27 11:46:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0088", name: "Diazepam injection 10mg", buyingCost: 900, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-27 10:55:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0061", name: "Vitamin C tablets 100mg", buyingCost: 25, category: "Drug", costCentre: "Pharmacy", sellingPrice: 250, customPrices: null, lastEditedOn: "2026-06-27 00:00:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0118", name: "Coartem tablets 20mg/120mg", buyingCost: 58.3, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-27 00:00:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0158", name: "Albendazole tablets 400mg", buyingCost: 260, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-27 00:00:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0001", name: "Prednisolone tablets 5mg", buyingCost: 18, category: "Drug", costCentre: "Pharmacy", sellingPrice: 200, customPrices: null, lastEditedOn: "2026-06-27 00:00:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0244", name: "Magnesium tablets 250mg", buyingCost: 18, category: "Drug", costCentre: "Pharmacy", sellingPrice: 250, customPrices: null, lastEditedOn: "2026-06-27 00:00:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0024", name: "Ringer lactate (500mls)", buyingCost: 1550, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-26 23:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0122", name: "Levofloxacin infusion 100ml , 0.5%w/v", buyingCost: 2100, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-26 23:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0076", name: "Metronidazole injection, 100ml , 0.5%w/v", buyingCost: 1150, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-26 23:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0086", name: "Paracetamol infusion 100ml", buyingCost: 2000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 12000, customPrices: null, lastEditedOn: "2026-06-26 23:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0082", name: "Hydrocortisone injection 100mg", buyingCost: 800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 6000, customPrices: null, lastEditedOn: "2026-06-26 23:29:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0078", name: "Omeprazole injection 40mg", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 20000, customPrices: null, lastEditedOn: "2026-06-26 23:29:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0133", name: "Dexamethasone injection 2ml, 8mg/2ml", buyingCost: 750, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-26 23:29:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0018", name: "Rectal diclofenac 100mg", buyingCost: 740, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-26 23:29:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0075", name: "Ceftriaxone inj 1g", buyingCost: 950, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-26 20:27:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0247", name: "Montelucast & levocetirizine tablets  ,10mg/5mg", buyingCost: 360, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-26 18:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0256", name: "Acewel-p( aceclo-fenac and paracetamol ) tablets", buyingCost: 90, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-26 18:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0072", name: "Ampiclox capsules 500mg", buyingCost: 118, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-26 14:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0168", name: "Amoxicillin capsules 250mg", buyingCost: 48, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-26 14:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5319", name: "ARTHOBOON (Collagen peptide, glucosamine & vitamin c powder)", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-26 14:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-06-22 21:47:00" },
    { itemCode: "A2986", name: "Azithromycin tablets 500mg", buyingCost: 900, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3500, customPrices: null, lastEditedOn: "2026-06-26 14:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-09-09 21:32:00" },
    { itemCode: "A4182", name: "Artecal tabets\n( calcium & calcitriol tablets)", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-26 14:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-01-26 12:43:00" },
    { itemCode: "DRG0353", name: "Haloperidol injection, 5mg/ml,   1ml", buyingCost: 9300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-26 13:30:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0121", name: "Normal saline I.v infusion", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 6000, customPrices: null, lastEditedOn: "2026-06-26 07:28:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0084", name: "Diclofenac injection 75mg/3ml", buyingCost: 180, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-26 07:28:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0073", name: "Fremol blue tablets", buyingCost: 50, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-26 02:29:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0290", name: "Drez V gel 30g", buyingCost: 9000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 20000, customPrices: null, lastEditedOn: "2026-06-25 21:54:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A1980", name: "COSYP-D Linctus", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-25 21:54:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-08-30 09:07:00" },
    { itemCode: "M327", name: "Amoxicillin syrup 100ml , 125mg/5ml", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-25 20:48:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0145", name: "Isoryn paediatric nasal drops 15ml", buyingCost: 5300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-25 20:48:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0094", name: "Metochlopramide injection 2ml(10MG)", buyingCost: 500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-25 20:42:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A4221", name: "Haemo Forte syrup , 200ml", buyingCost: 7500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 30000, customPrices: null, lastEditedOn: "2026-06-25 16:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-03-28 12:44:00" },
    { itemCode: "A4223", name: "Cefixime syrup 60ml", buyingCost: 5500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 30000, customPrices: null, lastEditedOn: "2026-06-25 16:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-03-28 17:18:00" },
    { itemCode: "DRG0293", name: "Haemo Forte syrup , 90ml", buyingCost: 3800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-25 16:02:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0020", name: "Rectal paracetamol 250mg.", buyingCost: 900, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-25 00:31:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0091", name: "Hydralazine injection 1ml ,20mg", buyingCost: 5000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-25 00:31:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0134", name: "Ampicillin injection 500mg", buyingCost: 650, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-25 00:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0297", name: "Duragestic tablets", buyingCost: 420, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-24 23:19:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0221", name: "Atenolol tablets 100mg", buyingCost: 38, category: "Drug", costCentre: "Pharmacy", sellingPrice: 200, customPrices: null, lastEditedOn: "2026-06-24 23:16:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0222", name: "Bendroflumethiazide tablets 5mg", buyingCost: 58, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-24 23:16:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0090", name: "Oxytocin injection 10.0 I.U", buyingCost: 1000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 20000, customPrices: null, lastEditedOn: "2026-06-24 16:35:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0059", name: "Vitamin B complex injection 2ml  ,IM/IV", buyingCost: 500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-24 16:35:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0002", name: "Pregabalin capsules 75mg", buyingCost: 250, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-24 16:35:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0023", name: "Relcer gel syrup 180ml", buyingCost: 7400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 25000, customPrices: null, lastEditedOn: "2026-06-24 13:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0058", name: "Vitamin A capsules 200,000IU", buyingCost: 400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-24 13:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0179", name: "Ascoril syrup 100ml", buyingCost: 6000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-24 13:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0241", name: "Levofloxacin tablets 500mg", buyingCost: 200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-24 13:21:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0067", name: "ZEEL KIT tabs(Clarithromycin,Metronidazole & pantoprazole)", buyingCost: 1964.3, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3600, customPrices: null, lastEditedOn: "2026-06-23 23:17:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0074", name: "Metronidazole tablets 200mg", buyingCost: 24.5, category: "Drug", costCentre: "Pharmacy", sellingPrice: 300, customPrices: null, lastEditedOn: "2026-06-23 22:08:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0079", name: "Paracetamol tablets 500mg", buyingCost: 180, category: "Drug", costCentre: "Pharmacy", sellingPrice: 250, customPrices: null, lastEditedOn: "2026-06-23 22:08:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0095", name: "Dextrose 5%", buyingCost: 1550, category: "Drug", costCentre: "Pharmacy", sellingPrice: 6000, customPrices: null, lastEditedOn: "2026-06-23 21:13:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0156", name: "Artesunate injection 60mg", buyingCost: 1600, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-23 21:13:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0199", name: "Promethazine syrup 60mls", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 21:04:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0266", name: "Dicloday gel 30g", buyingCost: 2000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-23 20:53:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0148", name: "Paracetamol syrup 60ml , 120mg/5ml", buyingCost: 850, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 20:53:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0008", name: "Probeta-N eye, ear, nosal drops 7.5mls", buyingCost: 3200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 20:53:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0264", name: "Ampiclox injection 500mg", buyingCost: 1200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-23 18:23:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5272", name: "DEXONA (Neomycin & dexamethasone)  eye/eardrops", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 16:39:00", lastEditedBy: "Susan Apio", registeredOn: "2026-05-01 16:43:00" },
    { itemCode: "DRG0140", name: "Lidocaine injection 30ml , 2%", buyingCost: 1400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 16:09:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0050", name: "Tranexamic acid injection 250mg , 100mg/ml", buyingCost: 2500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 16:09:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0138", name: "Aspirin tablets 75mg (ECORIN-75)", buyingCost: 100, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-23 13:06:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0200", name: "Amoxiclav tablets, 625mg", buyingCost: 450, category: "Drug", costCentre: "Pharmacy", sellingPrice: 4000, customPrices: null, lastEditedOn: "2026-06-23 12:51:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A002", name: "Dexamethasone tablets 0.5mg", buyingCost: 19.5, category: "Drug", costCentre: "Pharmacy", sellingPrice: 250, customPrices: null, lastEditedOn: "2026-06-23 12:51:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0360", name: "Cefixime capsules 400mg", buyingCost: 5240, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-23 09:06:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "M317", name: "Adrenaline injection", buyingCost: 800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-23 08:45:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0019", name: "Rectal paracetamol 125mg", buyingCost: 700, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-22 23:48:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A4179", name: "Norethisterone tablets 5mg", buyingCost: 666.7, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-22 22:47:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-01-24 19:41:00" },
    { itemCode: "DRG0048", name: "Tramadol capsules 50mg", buyingCost: 70, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-22 22:28:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0201", name: "Nifedipine tablets 20mg", buyingCost: 35, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-22 22:28:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5320", name: "Fluconazole syrup 100ml,  50mg/5ml", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 20000, customPrices: null, lastEditedOn: "2026-06-22 22:08:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-06-22 22:08:00" },
    { itemCode: "M609", name: "Tetracycline ointment (TEO) 3.5g , 1%", buyingCost: 1000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-22 21:59:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0077", name: "Nat B capsules ( high potency B vitamins formula)", buyingCost: 566.7, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-22 17:52:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0205", name: "Silver nitrate pencil 40%w/w", buyingCost: 6500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 20000, customPrices: null, lastEditedOn: "2026-06-22 15:53:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0193", name: "Cefixime tablets 200mg (FIMABUTE)", buyingCost: 380, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-22 15:52:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0085", name: "Omeprazole capsules 20mg", buyingCost: 38, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-22 15:52:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0313", name: "Flucamox syrup 80ml, 250mg", buyingCost: 15300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 50000, customPrices: null, lastEditedOn: "2026-06-22 13:35:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A923", name: "Atorvastatin calcium tablets 20mg", buyingCost: 357.1, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1500, customPrices: null, lastEditedOn: "2026-06-22 13:21:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-20 22:25:00" },
    { itemCode: "A4191", name: "Amlozar H tablets 50mg", buyingCost: 1400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3500, customPrices: null, lastEditedOn: "2026-06-22 13:21:00", lastEditedBy: "Carol Nakamya", registeredOn: "2026-02-03 15:44:00" },
    { itemCode: "DRG0239", name: "Tetanus Toxoid vaccines", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: "SECURITY GROUP AFRICA SGA: 30000.00, DIPPSI CONCRETE COMPANY: 10000.00, KPI SECURITY SERVICES: 10000.00, HOPE SHINE UGANDA: 10000.00, BROOD COMPANY: 10000.00, NILEPLY WOOD: 10000.00, CREATIVE ALUMINIUM & GLASSES: 30000.00, SMUG: 30000.00, WAMUCO MOTORS LTD: 30000.00, KIWULIRIZA CHILD DEVELOPMENT CENTRE: 30000.00, GARDAWORLD SECURITY: 10000.00, UAP OLD MUTUAL  INSURANCE: 30000.00, WINWORLD ENERGY LTD: 10000.00, DIPPSI WATERPROOF LTD.: 10000.00", lastEditedOn: "2026-06-21 11:48:00", lastEditedBy: "George Otim", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0113", name: "Ceftriaxone and sulbactum injection 1.5g", buyingCost: 2000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-21 00:01:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0322", name: "P-Alaxin tablets, 40mg/320mg", buyingCost: 788.9, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2777, customPrices: null, lastEditedOn: "2026-06-20 17:12:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0269", name: "Tramadol injection 2ml , 50mg/ml", buyingCost: 600, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-20 15:58:00", lastEditedBy: "Benadette Twongirwe", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0120", name: "Fluconazole injection 100ml , 2mg/ml", buyingCost: 4000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-20 15:30:00", lastEditedBy: "Benadette Twongirwe", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0242", name: "Infacol syrup 40mg/ml", buyingCost: 31000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 55000, customPrices: null, lastEditedOn: "2026-06-20 15:13:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0128", name: "Metformin tablets 500mg", buyingCost: 30, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-20 14:34:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A3084", name: "Lydia injection 1ml (injectaplan)", buyingCost: 2200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-20 14:03:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-10-28 20:15:00" },
    { itemCode: "A5302", name: "Anusol cream 23g.", buyingCost: 18000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 30000, customPrices: null, lastEditedOn: "2026-06-20 10:15:00", lastEditedBy: "Mercy Asio", registeredOn: "2026-05-25 08:42:00" },
    { itemCode: "A005B", name: "Amoxiclav syrup 100ml", buyingCost: 8000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 25000, customPrices: null, lastEditedOn: "2026-06-19 22:11:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0129", name: "Glibenclamide tablets 5mg", buyingCost: 56.7, category: "Drug", costCentre: "Pharmacy", sellingPrice: 300, customPrices: null, lastEditedOn: "2026-06-19 14:59:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0060", name: "Vitamin B complex tablets", buyingCost: 130, category: "Drug", costCentre: "Pharmacy", sellingPrice: 250, customPrices: null, lastEditedOn: "2026-06-19 14:59:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0022", name: "Relcer gel syrup 100ml", buyingCost: 4900, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-19 13:58:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0132", name: "Dynapar tablets (50/500mg)", buyingCost: 105, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-19 13:57:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0329", name: "Tamsulosin HCL capsules 400 micro-grams", buyingCost: 533.3, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-19 10:55:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0114", name: "PISA injection 4.5g", buyingCost: 12000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 30000, customPrices: null, lastEditedOn: "2026-06-18 23:32:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A4231", name: "Ondansetron tablets 4mg", buyingCost: 380, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1500, customPrices: null, lastEditedOn: "2026-06-18 22:11:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-04-08 13:16:00" },
    { itemCode: "DRG0152", name: "Fluconazole capsules 200mg", buyingCost: 190, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-18 20:43:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0111", name: "Epicephine injection 2gm", buyingCost: 17800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 40000, customPrices: null, lastEditedOn: "2026-06-18 16:19:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0104", name: "Ondansetron injection 2mg/ml", buyingCost: 2600, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-18 16:18:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0101", name: "Furosemide injection 2ml", buyingCost: 350, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-18 16:18:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0334", name: "Sucrafil O Gel suspension 200ml", buyingCost: 11500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 50000, customPrices: null, lastEditedOn: "2026-06-18 12:28:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5316", name: "Ceromax tablets", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-18 11:51:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-06-18 11:50:00" },
    { itemCode: "DRG0098", name: "Nitrofurantoin tablets 100mg", buyingCost: 34, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-18 00:54:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0294", name: "Salbutamol nebulizer solution , 2.5mg", buyingCost: 850, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-18 00:52:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0087", name: "Dynapar injection75mg/ml", buyingCost: 1300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-18 00:51:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0107", name: "Atropine injection IP 0.6mg/ml", buyingCost: 800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 6000, customPrices: null, lastEditedOn: "2026-06-17 08:40:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0178", name: "Apflu syrup 100ml", buyingCost: 3550, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-17 01:22:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0144", name: "Isoryn adult nasal drops 15ml", buyingCost: 5200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-16 21:12:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0151", name: "Griseofulvin tablets , 500mg", buyingCost: 215, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-16 16:22:00", lastEditedBy: "Susan Apio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0045", name: "Tinidazole tablets 500mg", buyingCost: 67, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-16 15:47:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0115", name: "NO-SPA injection 2ml", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-16 13:14:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A4163", name: "Reniron capsules [ferous fumarate, folic acid and vit c]", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-16 11:50:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-01-16 11:22:00" },
    { itemCode: "A004", name: "Pen v /phenoxymethylpenicillin tablets 250mg", buyingCost: 75, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-16 11:02:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0080", name: "Drotaverine hydrochloride tablets 40mg", buyingCost: 160, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-15 23:28:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0198", name: "Doxycycline capsules 100mg", buyingCost: 50, category: "Drug", costCentre: "Pharmacy", sellingPrice: 700, customPrices: null, lastEditedOn: "2026-06-15 23:28:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0292", name: "Rivaroksaban tablets 20mg", buyingCost: 3500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 5000, customPrices: null, lastEditedOn: "2026-06-15 23:07:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0278", name: "Insulin Actrapid", buyingCost: 240, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-15 10:32:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0279", name: "Insulin Mixtard", buyingCost: 240, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-15 10:32:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0010", name: "Nystatin syrup 30ml  , 100000 IU/ml", buyingCost: 1500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-15 09:54:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0170", name: "ORS (Oral Rehydration Salts) 20.5g", buyingCost: 540, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1000, customPrices: null, lastEditedOn: "2026-06-14 14:05:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0181", name: "Cetirizine tablets10mg", buyingCost: 14, category: "Drug", costCentre: "Pharmacy", sellingPrice: 400, customPrices: null, lastEditedOn: "2026-06-14 14:05:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0210", name: "Hydrocortisone cream 15g , 1% w/w", buyingCost: 1200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-14 14:05:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0253", name: "Captopril tablets 25mg", buyingCost: 125, category: "Drug", costCentre: "Pharmacy", sellingPrice: 400, customPrices: null, lastEditedOn: "2026-06-14 11:05:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0089", name: "Dextrose 50%", buyingCost: 30, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-13 21:55:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0351", name: "Finasteride 5mg", buyingCost: 428, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2500, customPrices: null, lastEditedOn: "2026-06-13 19:35:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0069", name: "Zycel capsules 200mg", buyingCost: 222, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2500, customPrices: null, lastEditedOn: "2026-06-13 19:06:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5313", name: "Potassium chloride", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-13 15:13:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-06-13 15:06:00" },
    { itemCode: "DRG0177", name: "Mucogel syrup125ml", buyingCost: 10800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 35000, customPrices: null, lastEditedOn: "2026-06-13 11:10:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0015", name: "Quinine injection 600mg/2ml", buyingCost: 800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-13 09:39:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0116", name: "Gentamicin injection 80mg/2ml", buyingCost: 260, category: "Drug", costCentre: "Pharmacy", sellingPrice: 6000, customPrices: null, lastEditedOn: "2026-06-12 22:11:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0295", name: "Deep Freeze", buyingCost: 25500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 50000, customPrices: null, lastEditedOn: "2026-06-12 17:56:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5271", name: "Claridone syrup 125ml", buyingCost: 10500, category: "Drug", costCentre: "Pharmacy", sellingPrice: 35000, customPrices: null, lastEditedOn: "2026-06-12 17:34:00", lastEditedBy: "Namwenge Kana", registeredOn: "2026-05-01 15:40:00" },
    { itemCode: "DRG0237", name: "Pethadine 50mg/ml 2ml vial", buyingCost: 2501.8, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-12 17:22:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0016", name: "Rabies vaccine , human I.P", buyingCost: 22892, category: "Drug", costCentre: "Pharmacy", sellingPrice: 70000, customPrices: null, lastEditedOn: "2026-06-12 17:22:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0068", name: "Zinc sulfate dispersible tablets 20mg", buyingCost: 25, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-12 14:41:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A4180", name: "G-Glutamin tablets 1x30", buyingCost: 400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 2000, customPrices: null, lastEditedOn: "2026-06-11 22:21:00", lastEditedBy: "Hellen Adubango", registeredOn: "2026-01-24 19:43:00" },
    { itemCode: "DRG0035", name: "Skderm cream 30g", buyingCost: 2300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-11 19:52:00", lastEditedBy: "Mercy Asio", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0123", name: "Mannitol i.v infusion 100ml , 200gm/l", buyingCost: 2800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 40000, customPrices: null, lastEditedOn: "2026-06-11 18:40:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A5301", name: "Dinoprostone Vaginal Gel 2mg", buyingCost: 45000, category: "Drug", costCentre: "Pharmacy", sellingPrice: 100000, customPrices: null, lastEditedOn: "2026-06-11 17:33:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2026-05-23 10:57:00" },
    { itemCode: "DRG0141", name: "Bupivacaine injection 20ml, 2%", buyingCost: 0, category: "Drug", costCentre: "Pharmacy", sellingPrice: 15000, customPrices: null, lastEditedOn: "2026-06-11 08:45:00", lastEditedBy: "Aber Clare", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0202", name: "Ciprofloxacin tablets 500mg", buyingCost: 95, category: "Drug", costCentre: "Pharmacy", sellingPrice: 700, customPrices: null, lastEditedOn: "2026-06-11 08:41:00", lastEditedBy: "Namwenge Kana", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "M129", name: "Ampiclox syrup 100ml , 250mg/5ml", buyingCost: 2300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-10 17:24:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0065", name: "Vitamin k/ k-one injection 1ml", buyingCost: 1400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-10 17:24:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0220", name: "Carbamazepine tablets 200mg", buyingCost: 95, category: "Drug", costCentre: "Pharmacy", sellingPrice: 500, customPrices: null, lastEditedOn: "2026-06-09 14:35:00", lastEditedBy: "Daniel Agea Olake", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "M341", name: "Benzathine penicillin injection 2.4mega", buyingCost: 1200, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-08 22:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A3085", name: "Phenytoin injection, 50mg/ml. 5ml", buyingCost: 3300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 30000, customPrices: null, lastEditedOn: "2026-06-08 22:30:00", lastEditedBy: "Hellen Adubango", registeredOn: "2025-11-01 17:36:00" },
    { itemCode: "DRG0175", name: "Cetirizine hydrochloride syrup, 60ml,  5mg/5ml", buyingCost: 1400, category: "Drug", costCentre: "Pharmacy", sellingPrice: 10000, customPrices: null, lastEditedOn: "2026-06-08 17:58:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0093", name: "Ferrous sulphate+ folic acid tablets", buyingCost: 35, category: "Drug", costCentre: "Pharmacy", sellingPrice: 200, customPrices: null, lastEditedOn: "2026-06-08 13:15:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "DRG0186", name: "Meniphib tablets", buyingCost: 300, category: "Drug", costCentre: "Pharmacy", sellingPrice: 1500, customPrices: null, lastEditedOn: "2026-06-08 13:01:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-07-01 16:04:00" },
    { itemCode: "A3019", name: "KEPRA 500mg tabs 50's", buyingCost: 1800, category: "Drug", costCentre: "Pharmacy", sellingPrice: 3000, customPrices: null, lastEditedOn: "2026-06-08 13:01:00", lastEditedBy: "Carol Nakamya", registeredOn: "2025-09-29 08:11:00" },
  ];

  // Combine with supplementary data files
  const allDrugs = [...drugs, ...remainingDrugs, ...remainingDrugs2, ...remainingDrugs3, ...remainingDrugs4, ...remainingDrugs5];

  console.log(`Importing ${allDrugs.length} drugs...`);

  // Insert in batches of 50 to avoid overwhelming the connection
  const BATCH_SIZE = 50;
  let imported = 0;

  for (let i = 0; i < allDrugs.length; i += BATCH_SIZE) {
    const batch = allDrugs.slice(i, i + BATCH_SIZE);
    const records = batch.map((d: DrugRow) => ({
      itemCode: d.itemCode,
      name: d.name,
      category: d.category || "Drug",
      costCentre: d.costCentre || "Pharmacy",
      buyingCost: d.buyingCost || 0,
      sellingPrice: d.sellingPrice || 0,
      customPrice: d.customPrices ? null : null, // customPrices is text — we store as null for simple import
      stockQuantity: 0, // forced to 0 for all imported drugs
      reorderLevel: 10, // default threshold
      lastEditedBy: d.lastEditedBy || "",
      lastEditedOn: parseDate(d.lastEditedOn),
      registeredOn: parseDate(d.registeredOn),
    }));

    await prisma.drug.createMany({ data: records, skipDuplicates: true });
    imported += batch.length;
    console.log(`  Imported ${imported}/${drugs.length} drugs...`);
  }

  const total = await prisma.drug.count();
  console.log(`\nDone! ${total} drugs in database.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
