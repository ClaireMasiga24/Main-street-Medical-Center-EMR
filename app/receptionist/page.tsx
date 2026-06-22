"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search, UserPlus, UserCheck, ArrowRight, CheckCircle2,
  AlertCircle, ShieldAlert, FileText, Phone, MapPin, FileHeart,
  LogOut, Receipt, Plus, Trash2, CreditCard, Banknote, Smartphone,
  Printer, X, BadgeCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
  age: number;
  dob: string | null;
  gender: string;
  phone: string | null;
  address: string | null;
  chiefComplaint: string;
  isEmergency: boolean;
  status: string;
  createdAt: string;
}

interface BillLine {
  id: string;           // local uuid for React key
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD" | "INSURANCE";

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={15} />,
  MOBILE_MONEY: <Smartphone size={15} />,
  CARD: <CreditCard size={15} />,
  INSURANCE: <BadgeCheck size={15} />,
};

const formatUGX = (n: number) =>
  "UGX " + Math.round(n).toLocaleString("en-UG");

// ─── CashierPOS ───────────────────────────────────────────────────────────────

function CashierPOS({ patients }: { patients: Patient[] }) {
  // Patient selection
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Bill lines — cashier types these in manually
  const [billLines, setBillLines] = useState<BillLine[]>([]);

  // New line form
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");

  // Payment
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState("");

  // Totals
  const subtotal = billLines.reduce((s, l) => s + l.subtotal, 0);
  const total = subtotal;
  const tendered = parseFloat(amountTendered) || 0;
  const change = tendered - total;

  const canConfirm = !!selectedPatient && billLines.length > 0;
  const canPay =
    invoiceConfirmed &&
    (paymentMethod !== "CASH" || tendered >= total);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.lastName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patientNumber.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Add a manually entered line item
  const handleAddLine = () => {
    const desc = newDesc.trim();
    const qty = parseInt(newQty) || 1;
    const price = parseFloat(newPrice.replace(/,/g, "")) || 0;
    if (!desc || price <= 0) return;
    setBillLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: desc, qty, unitPrice: price, subtotal: qty * price },
    ]);
    setNewDesc("");
    setNewQty("1");
    setNewPrice("");
    setInvoiceConfirmed(false);
  };

  const updateLineQty = (id: string, delta: number) => {
    setBillLines((prev) =>
      prev
        .map((l) =>
          l.id === id
            ? { ...l, qty: l.qty + delta, subtotal: (l.qty + delta) * l.unitPrice }
            : l
        )
        .filter((l) => l.qty > 0)
    );
    setInvoiceConfirmed(false);
  };

  const removeLine = (id: string) => {
    setBillLines((prev) => prev.filter((l) => l.id !== id));
    setInvoiceConfirmed(false);
  };

  const handleProcessPayment = async () => {
    if (!selectedPatient) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/receptionist?resource=billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          paymentMethod,
          amountTendered: paymentMethod === "CASH" ? tendered : total,
          reference: ["MOBILE_MONEY", "CARD"].includes(paymentMethod) ? paymentReference : null,
          insuranceProvider: paymentMethod === "INSURANCE" ? insuranceProvider : null,
          insurancePolicyNumber: paymentMethod === "INSURANCE" ? insurancePolicyNumber : null,
          lines: billLines.map((l) => ({
            description: l.description,
            qty: l.qty,
            unitPrice: l.unitPrice,
            subtotal: l.subtotal,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        alert(`Payment failed: ${body.error}`);
        return;
      }

      const data = await res.json();
      setSavedInvoiceNumber(data.invoiceNumber ?? `INV-${selectedPatient.patientNumber}-${Date.now().toString().slice(-5)}`);
      setReceiptVisible(true);
    } catch {
      alert("Network error — payment could not be processed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewBill = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setBillLines([]);
    setNewDesc(""); setNewQty("1"); setNewPrice("");
    setPaymentMethod("CASH");
    setAmountTendered("");
    setPaymentReference("");
    setInsuranceProvider("");
    setInsurancePolicyNumber("");
    setInvoiceConfirmed(false);
    setReceiptVisible(false);
    setSavedInvoiceNumber("");
  };

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-5">

      {/* ── LEFT ── */}
      <div className="space-y-4 lg:col-span-3">

        {/* Patient Selector */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Bill To — Patient
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={selectedPatient
                ? `${selectedPatient.patientNumber} — ${selectedPatient.lastName}, ${selectedPatient.firstName}`
                : patientSearch}
              onChange={(e) => {
                if (selectedPatient) setSelectedPatient(null);
                setPatientSearch(e.target.value);
                setShowDropdown(true);
                setInvoiceConfirmed(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search patient by name or ID…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm font-semibold outline-none transition focus:border-[#00703C] focus:bg-white"
            />
            {selectedPatient && (
              <button
                onClick={() => { setSelectedPatient(null); setPatientSearch(""); setInvoiceConfirmed(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <X size={15} />
              </button>
            )}
            {showDropdown && !selectedPatient && filteredPatients.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {filteredPatients.slice(0, 7).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setPatientSearch(""); setShowDropdown(false); setInvoiceConfirmed(false); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#00703C] font-mono">{p.patientNumber}</span>
                      <span className="text-slate-700 font-semibold">{p.lastName}, {p.firstName}</span>
                    </div>
                    <span className="text-slate-400">{p.age} yrs</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPatient && (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
              <span className="rounded bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 font-mono">{selectedPatient.patientNumber}</span>
              <span className="text-slate-500">{selectedPatient.gender} · {selectedPatient.age} yrs</span>
              {selectedPatient.phone && <span className="text-slate-500"><Phone size={10} className="inline mr-0.5" />{selectedPatient.phone}</span>}
              {selectedPatient.isEmergency && (
                <span className="rounded bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 flex items-center gap-1">
                  <ShieldAlert size={10} /> Emergency
                </span>
              )}
            </div>
          )}
        </div>

        {/* Add Item Form */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Add Item to Bill</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Description */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Service / Item Description *</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLine()}
                placeholder="e.g., General Consultation, Malaria RDT, Wound Dressing…"
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-[#00703C]"
              />
            </div>
            {/* Qty + Price row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unit Price (UGX)</label>
                <input
                  type="number"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLine()}
                  placeholder="e.g., 20000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]"
                />
              </div>
            </div>
            {/* Preview */}
            {newDesc && parseFloat(newPrice) > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                <span>{newDesc} × {newQty || 1}</span>
                <span>{formatUGX((parseInt(newQty) || 1) * (parseFloat(newPrice) || 0))}</span>
              </div>
            )}
            <button
              onClick={handleAddLine}
              disabled={!newDesc.trim() || !newPrice || parseFloat(newPrice) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Add to Bill
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Bill + Payment ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Bill Header */}
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Current Bill</p>
            {billLines.length > 0 && (
              <button onClick={() => { setBillLines([]); setInvoiceConfirmed(false); }} className="text-[10px] text-rose-400 hover:text-rose-600 font-bold flex items-center gap-0.5">
                <Trash2 size={10} /> Clear
              </button>
            )}
          </div>

          {/* Bill Lines */}
          <div className="min-h-[120px] divide-y divide-slate-50 overflow-y-auto max-h-56">
            {billLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                <Receipt size={28} />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">No items added</p>
              </div>
            ) : (
              billLines.map((line) => (
                <div key={line.id} className="flex items-center gap-2 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-700">{line.description}</p>
                    <p className="text-[10px] text-slate-400">{formatUGX(line.unitPrice)} × {line.qty}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => updateLineQty(line.id, -1)} className="flex h-5 w-5 items-center justify-center rounded-lg border border-slate-200 text-slate-500 text-xs hover:border-rose-300 hover:text-rose-500 transition">−</button>
                    <span className="w-5 text-center text-[11px] font-black text-slate-800">{line.qty}</span>
                    <button onClick={() => updateLineQty(line.id, +1)} className="flex h-5 w-5 items-center justify-center rounded-lg border border-slate-200 text-slate-500 text-xs hover:border-emerald-300 hover:text-emerald-600 transition">+</button>
                    <button onClick={() => removeLine(line.id)} className="ml-1 text-slate-300 hover:text-rose-500 transition"><Trash2 size={12} /></button>
                  </div>
                  <span className="ml-1 text-[11px] font-extrabold text-slate-800 w-20 text-right flex-shrink-0">{formatUGX(line.subtotal)}</span>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 px-5 py-3 space-y-1 bg-slate-50/40">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Subtotal</span><span className="font-bold">{formatUGX(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2 mt-1">
              <span>TOTAL DUE</span><span className="text-[#00703C]">{formatUGX(total)}</span>
            </div>
          </div>

          {/* Confirm Invoice */}
          {!invoiceConfirmed && (
            <div className="px-5 pb-4">
              <button
                disabled={!canConfirm}
                onClick={() => setInvoiceConfirmed(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold uppercase tracking-widest transition-all bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileText size={13} /> Confirm Invoice
              </button>
            </div>
          )}

          {/* Payment Section */}
          {invoiceConfirmed && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Payment Method</p>

              <div className="grid grid-cols-2 gap-2">
                {(["CASH", "MOBILE_MONEY", "CARD", "INSURANCE"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                      paymentMethod === method
                        ? "border-[#00703C] bg-emerald-50 text-[#00703C]"
                        : "border-slate-200 text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {PAYMENT_ICONS[method]}
                    {method.replace("_", " ")}
                  </button>
                ))}
              </div>

              {paymentMethod === "CASH" && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Amount Tendered (UGX)</label>
                  <input
                    type="number" min={0} value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="Enter cash amount…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]"
                  />
                  {tendered > 0 && (
                    <div className={`mt-2 flex justify-between rounded-xl px-3 py-2 text-xs font-extrabold ${change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                      <span>{change >= 0 ? "Change" : "Shortfall"}</span>
                      <span>{formatUGX(Math.abs(change))}</span>
                    </div>
                  )}
                </div>
              )}

              {(paymentMethod === "MOBILE_MONEY" || paymentMethod === "CARD") && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {paymentMethod === "MOBILE_MONEY" ? "Mobile Money Transaction ID" : "Card / POS Reference"}
                  </label>
                  <input
                    type="text" value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter reference number…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]"
                  />
                </div>
              )}

              {paymentMethod === "INSURANCE" && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Insurance Provider</label>
                    <input type="text" value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)}
                      placeholder="e.g., UAP, ICEA, AAR…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Policy / Claim Number</label>
                    <input type="text" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      placeholder="Policy number…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#00703C]" />
                  </div>
                </div>
              )}

              <button
                disabled={!canPay || isProcessing}
                onClick={handleProcessPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00703C] py-3 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-emerald-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={14} />
                {isProcessing ? "Processing…" : "Process Payment"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receiptVisible && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#00703C] px-6 py-5 text-center text-white">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest">Payment Received</h3>
              <p className="text-[10px] mt-0.5 text-emerald-100">Main Street Medical Center</p>
            </div>

            <div className="px-6 py-4 space-y-2 font-mono text-xs text-slate-700">
              <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span>Invoice</span><span>{savedInvoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-bold">{selectedPatient.lastName}, {selectedPatient.firstName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID</span>
                <span className="font-bold text-[#00703C]">{selectedPatient.patientNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span>{new Date().toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-bold">{paymentMethod.replace("_", " ")}</span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                {billLines.map((l) => (
                  <div key={l.id} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">{l.description} ×{l.qty}</span>
                    <span>{formatUGX(l.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm">
                <span>TOTAL</span><span className="text-[#00703C]">{formatUGX(total)}</span>
              </div>

              {paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Tendered</span><span>{formatUGX(tendered)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Change</span>
                    <span className="font-bold text-emerald-600">{formatUGX(change)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => window.print()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition"
              >
                <Printer size={12} /> Print Receipt
              </button>
              <button
                onClick={handleNewBill}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#00703C] py-3 text-[10px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-800 transition"
              >
                <Receipt size={12} /> New Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceptionistPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "register" | "cashier">("search");
  const [registrationMode, setRegistrationMode] = useState<"normal" | "emergency">("normal");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", age: "", dob: "", gender: "",
    phone: "", address: "", chiefComplaint: "",
  });

  const fetchActiveRegistry = async () => {
    try {
      const res = await fetch("/api/receptionist?resource=patients");
      if (res.ok) setPatients(await res.json());
    } catch (err) {
      console.error("Tracking node sync failure:", err);
    }
  };

  useEffect(() => { fetchActiveRegistry(); }, []);

  const normalFields = [
    { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "e.g., John" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Okello" },
    { id: "age", label: "Age", type: "number", required: true, placeholder: "Years" },
    { id: "dob", label: "Date of Birth", type: "date", required: true, placeholder: "" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "e.g., 0770000000" },
    { id: "address", label: "Residential Address", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Village, District details..." },
    { id: "chiefComplaint", label: "Chief Complaint", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Reason for visit..." },
  ];

  const emergencyFields = [
    { id: "firstName", label: "First Name / Alias", type: "text", required: true, placeholder: "Use 'Unknown' if unresponsive" },
    { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "e.g., Trauma Male Alpha" },
    { id: "age", label: "Estimated Age", type: "number", required: true, placeholder: "Estimated Years" },
    { id: "gender", label: "Gender", type: "select", required: true, options: ["MALE", "FEMALE", "OTHER"], placeholder: "" },
    { id: "chiefComplaint", label: "Emergency Presentation Details", type: "textarea", required: true, colSpan: "md:col-span-2", placeholder: "Describe presentation: RTA, severe bleeding..." },
  ];

  const activeFields = registrationMode === "emergency" ? emergencyFields : normalFields;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/receptionist?resource=patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName, lastName: formData.lastName, age: formData.age,
          dob: registrationMode === "normal" ? formData.dob : null,
          gender: formData.gender,
          phone: registrationMode === "normal" ? formData.phone : null,
          address: registrationMode === "normal" ? formData.address : null,
          chiefComplaint: formData.chiefComplaint,
          isEmergency: registrationMode === "emergency",
        }),
      });
      if (!response.ok) throw new Error("Failed validation write step.");
      await fetchActiveRegistry();
      setActiveTab("search");
      setFormData({ firstName: "", lastName: "", age: "", dob: "", gender: "", phone: "", address: "", chiefComplaint: "" });
      setSelectedPatient(null);
    } catch (err) {
      console.error(err);
      alert("Registration failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchPipeline = async (patientId: number, targetRoomStatus: string) => {
    try {
      const response = await fetch("/api/receptionist?resource=patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patientId, status: targetRoomStatus }),
      });
      if (response.ok) {
        alert(`Patient successfully routed to ${targetRoomStatus.replace(/_/g, " ")}`);
        await fetchActiveRegistry();
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error("Routing error:", err);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">

      {/* NAV */}
      <nav className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-100 md:h-14 md:w-14">
              <Image src="/Images/LOGO.jpg" alt="Main Street Medical Center Logo" fill priority sizes="56px" className="object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase md:text-xl">Main Street Medical Center</h1>
              <p className="text-[10px] font-semibold tracking-wide text-rose-600 md:text-xs">Commitment to Good Health</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100 md:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 tracking-wide uppercase">Receptionist Desk Active</span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 border border-red-100 text-red-600 hover:bg-red-100 transition-all"
            >
              <LogOut size={14} />
              <span className="text-xs font-bold tracking-wide uppercase">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-4 space-y-5 md:p-6">

        {/* TABS */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {([
            { key: "search", label: "Tracking Desk", icon: <Search size={15} />, color: "border-[#00703C] text-[#00703C]" },
            { key: "register", label: "Register Patient", icon: <UserPlus size={15} />, color: "border-[#00703C] text-[#00703C]" },
            { key: "cashier", label: "Cashier & Billing", icon: <Receipt size={15} />, color: "border-amber-500 text-amber-600" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all md:px-6 md:text-sm ${
                activeTab === tab.key ? tab.color : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-xs font-bold tracking-wide text-slate-500 uppercase mb-2">Live Master Registry Look-Up</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Unique ID, First Name, or Last Name..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[#00703C] focus:bg-white"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3 flex justify-between items-center">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Live Admissions</span>
                  <span className="text-xs font-bold text-slate-400 font-mono">{filteredPatients.length} Records</span>
                </div>
                {filteredPatients.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 mb-3"><AlertCircle size={28} className="text-slate-300" /></div>
                    <h3 className="text-sm font-bold text-slate-800">No Patient Logs Registered</h3>
                    <p className="mt-1 max-w-xs text-xs text-slate-400">Registry is currently empty.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPatients.map((patient) => (
                      <div
                        key={patient.id} onClick={() => setSelectedPatient(patient)}
                        className={`group flex items-center justify-between p-4 transition-all cursor-pointer hover:bg-slate-50/80 ${selectedPatient?.id === patient.id ? "bg-emerald-50/40 border-l-4 border-[#00703C]" : ""}`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold tracking-wider text-[#00703C] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{patient.patientNumber}</span>
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#00703C]">{patient.lastName}, {patient.firstName}</h4>
                            {patient.isEmergency && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-600 animate-pulse">
                                <ShieldAlert size={10} /> Emergency
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            <span><strong>Age/Sex:</strong> {patient.age} Yrs ({patient.gender})</span>
                            <span>•</span>
                            <span><strong>Status:</strong> {patient.status.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-[#00703C] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Workflow Router</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Route records across hospital workstations.</p>
                </div>
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <div className="text-base font-black text-slate-800">{selectedPatient.lastName}, {selectedPatient.firstName}</div>
                      <div className="font-mono text-xs font-bold text-[#00703C]">{selectedPatient.patientNumber}</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-500"><Phone size={14} /><span>Contact: <strong>{selectedPatient.phone || "Bypassed"}</strong></span></div>
                      <div className="flex items-center gap-2 text-slate-500"><MapPin size={14} /><span className="truncate">Address: <strong>{selectedPatient.address || "Bypassed"}</strong></span></div>
                      <div className="flex flex-col pt-2 border-t border-slate-100">
                        <span className="text-slate-400 font-bold mb-1 tracking-wider text-[10px] uppercase flex items-center gap-1"><FileHeart size={12} /> Presenting Details</span>
                        <p className="font-medium text-slate-600 bg-slate-50/80 border border-slate-100 p-3 rounded-xl max-h-24 overflow-y-auto">{selectedPatient.chiefComplaint}</p>
                      </div>
                    </div>
                    <div className="pt-2 space-y-2">
                      <button onClick={() => handleDispatchPipeline(selectedPatient.id, "AWAITING_TRIAGE")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00703C] py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition-all">
                        <UserCheck size={14} /> Dispatch to Triage
                      </button>
                      <button onClick={() => handleDispatchPipeline(selectedPatient.id, "AWAITING_SONOGRAPHY")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all">
                        <UserCheck size={14} /> Send to Sonographer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    Select a patient from the registry to route them.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REGISTER TAB */}
        {activeTab === "register" && (
          <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-200">
              <button type="button" onClick={() => setRegistrationMode("normal")}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === "normal" ? "bg-slate-50/50 text-[#00703C] border-b-2 border-[#00703C]" : "text-slate-400"}`}>
                <FileText size={14} /> Standard Admission
              </button>
              <button type="button" onClick={() => setRegistrationMode("emergency")}
                className={`flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all ${registrationMode === "emergency" ? "bg-rose-50/30 text-rose-600 border-b-2 border-rose-600" : "text-slate-400"}`}>
                <ShieldAlert size={14} /> Emergency Fast-Track
              </button>
            </div>
            <form onSubmit={handleRegisterPatient} className="grid gap-4 p-5 md:grid-cols-2">
              {activeFields.map((field: any) => (
                <div key={field.id} className={field.colSpan || ""}>
                  <label className="mb-1 block text-xs font-bold text-slate-600 tracking-wide">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select name={field.id} required={field.required} value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none bg-white transition focus:border-[#00703C]">
                      <option value="">Select Option</option>
                      {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea name={field.id} rows={3} required={field.required} placeholder={field.placeholder}
                      value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none transition focus:border-[#00703C]" />
                  ) : (
                    <input type={field.type} name={field.id} required={field.required} placeholder={field.placeholder}
                      value={(formData as any)[field.id]} onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#00703C]" />
                  )}
                </div>
              ))}
              <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setActiveTab("search")}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider transition-all ${registrationMode === "emergency" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#00703C] hover:bg-emerald-800"}`}>
                  <CheckCircle2 size={14} /> {isSubmitting ? "Saving..." : "Commit Record"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CASHIER TAB */}
        {activeTab === "cashier" && <CashierPOS patients={patients} />}

      </div>
    </main>
  );
}