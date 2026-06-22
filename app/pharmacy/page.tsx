"use client";

import { useEffect, useState } from "react";
import { Search, PackageCheck, Pill, LogOut, User } from "lucide-react";
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

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await fetch("/api/pharmacyroute");
        const data = await res.json();
        setQueue(data);
      } catch (err) {
        console.error("Failed to load queue", err);
      }
    }

    loadQueue();
  }, []);

  const filteredQueue = queue.filter((q) =>
    `${q.patient.firstName} ${q.patient.lastName} ${q.patient.patientNumber}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleLogout = () => {
    router.push("/");
  };

  async function dispense(id: number) {
    try {
      await fetch(`/api/pharmacyroute/${id}`, {
        method: "PATCH",
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

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-200 hover:text-white"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">

        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Pharmacy Dashboard
          </h2>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
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