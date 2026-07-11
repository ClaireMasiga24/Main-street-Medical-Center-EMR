"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, PackageCheck, Pill, LogOut, User } from "lucide-react";
import NotificationInbox from "../components/NotificationInbox";
import StaffMessaging from "../components/StaffMessaging";
import { useRouter } from "next/navigation";

type PrescriptionStatus = "PENDING" | "DISPENSED";

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string;
}

interface Prescription {
  id: number;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: PrescriptionStatus;
}

interface QueueItem {
  id: number;
  patient: Patient;
  prescriptions: Prescription[];
}

export default function PharmacyPage() {
  const router = useRouter();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await fetch("/api/pharmacy");
        const data = await res.json();
        // Transform API response to QueueItem format
        const items: QueueItem[] = (data.patients ?? []).map((p: any) => ({
          id: p.id,
          patient: {
            id: p.id,
            patientNumber: p.patientNumber,
            firstName: p.firstName,
            lastName: p.lastName,
          },
          prescriptions: (p.Prescription ?? []).map((rx: any) => ({
            id: rx.id,
            drugName: rx.medication || rx.drugName || "",
            dosage: rx.dosage || "",
            frequency: rx.frequency || "",
            duration: rx.duration || "",
            status: rx.status,
          })),
        }));
        setQueue(items);
      } catch (err) {
        console.error("Failed to load queue", err);
      }
    }

    loadQueue();
    try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {}
    const hb = setInterval(() => { try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); if (u.id) { fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) }); } } } catch {} }, 120000);
    return () => clearInterval(hb);
  }, []);

  const filteredQueue = queue.filter((q) =>
    `${q.patient.firstName} ${q.patient.lastName} ${q.patient.patientNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    try { const r = sessionStorage.getItem("user") || localStorage.getItem("user"); if (r) { const u = JSON.parse(r); await fetch("/api/logout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ userId: u.id, username: u.username }) }); } } catch {}
    router.push("/");
  };

  async function dispense(id: number) {
    try {
      await fetch("/api/pharmacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId: id }),
      });

      if (selected) {
        const updatedPrescriptions: Prescription[] =
          selected.prescriptions.map((p) =>
            p.id === id
              ? { ...p, status: "DISPENSED" as PrescriptionStatus }
              : p
          );

        setSelected({
          ...selected,
          prescriptions: updatedPrescriptions,
        });
      }
    } catch (err) {
      console.error("Dispense failed", err);
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">

      {/* Sidebar */}
      <aside className="w-64 bg-green-700 text-white p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold mb-6">Pharmacy</h1>

          <div className="space-y-3">
            <button className="flex items-center gap-2 hover:bg-green-600 p-2 rounded-lg w-full text-left">
              <Pill size={18} /> Prescriptions
            </button>

            <button className="flex items-center gap-2 hover:bg-green-600 p-2 rounded-lg w-full text-left">
              <User size={18} /> Patients
            </button>
          </div>
          </div>
          <div className="mt-4"><NotificationInbox department="Pharmacy" /></div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">

        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Pharmacy Dashboard
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
            <button type="button" className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-green-600 transition-colors z-10" onClick={() => setSearch(searchInputRef.current?.value || "")}>
              <Search size={18} />
            </button>
            <input
              ref={searchInputRef}
              defaultValue=""
              onChange={() => setSearch(searchInputRef.current?.value || "")}
              placeholder="Search patient..."
              className="w-full pl-12 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10" onClick={() => {
              if (searchInputRef.current) searchInputRef.current.value = "";
              setSearch("");
            }}>
              <X size={18} />
            </button>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
            <LogOut size={14} /> Logout
          </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Queue */}
          <div className="col-span-1 bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-4 text-green-700">
              Prescription Queue
            </h3>

            <div className="space-y-2">
              {filteredQueue.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelected(q)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-green-50"
                >
                  <p className="font-medium">
                    {q.patient.firstName} {q.patient.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {q.patient.patientNumber}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="col-span-2 bg-white p-4 rounded-xl shadow">

            {!selected ? (
              <p className="text-gray-500">
                Select a patient to view prescriptions
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    {selected.patient.firstName} {selected.patient.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selected.patient.patientNumber}
                  </p>
                </div>

                <div className="space-y-3">
                  {selected.prescriptions.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center border p-3 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{p.drugName}</p>
                        <p className="text-sm text-gray-500">
                          {p.dosage} • {p.frequency} • {p.duration}
                        </p>
                      </div>

                      {p.status === "DISPENSED" ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <PackageCheck size={16} /> Dispensed
                        </span>
                      ) : (
                        <button
                          onClick={() => dispense(p.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg"
                        >
                          Dispense
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}