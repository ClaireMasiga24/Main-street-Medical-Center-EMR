"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserRound,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  ClipboardList,
  CalendarDays,
  Activity,
  FileText,
  Settings,
  ShieldCheck,
} from "lucide-react";

const modules = [
  { title: "Reception", icon: UserRound, path:"/receptionist" },
  { title: "Doctors", icon: Stethoscope, path: null },
  { title: "Nurses & Midwives", icon: Activity, path: "/nurse-midwife" },
  { title: "Laboratory", icon: FlaskConical, path: "/laboratory" },
  { title: "Radiology", icon: ClipboardList, path: null },
  { title: "Pharmacy", icon: Pill, path: null },
  { title: "Accounts & Billing", icon: CreditCard, path: null },
  { title: "Appointments", icon: CalendarDays, path: null },
  { title: "Patient Records", icon: FileText, path: null },
  { title: "Staff Management", icon: Users, path: "/StaffManagement" },
  { title: "System Settings", icon: Settings, path: null },
  { title: "Audit & Security", icon: ShieldCheck, path: null },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!storedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "ADMINISTRATOR") {
      router.push("/");
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const logout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-40
          h-screen w-72
          bg-green-900 text-white
          transition-transform duration-300
          flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-6 border-b border-green-800">
          <div className="flex flex-col items-center">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street EMR"
              width={90}
              height={90}
              className="rounded-full bg-white p-1"
            />
            <h1 className="mt-4 text-2xl font-bold text-center">Main Street EMR</h1>
            <p className="text-green-200 text-sm mt-2 text-center">Administrator Dashboard</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="p-5 border-t border-green-800">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-medium transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <section className="flex-1 md:ml-72">
        {/* MOBILE HEADER */}
        <div className="md:hidden bg-green-900 text-white px-4 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-2xl">☰</button>
          <span className="font-semibold">Main Street EMR</span>
          <div className="w-6" />
        </div>

        <div className="p-4 md:p-8">
          {/* WELCOME */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
              Welcome Back, {user.username}
            </h2>
            <p className="text-gray-500 mt-2">Main Street Medical Center Administration</p>
          </div>

          {/* MODULE GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.title}
                  onClick={() => module.path && router.push(module.path)}
                  className={`
                    bg-white border border-gray-200 rounded-lg h-40
                    flex flex-col items-center justify-center
                    transition-all
                    ${module.path
                      ? "hover:bg-green-50 hover:border-green-300 hover:shadow-md cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                    }
                  `}
                >
                  <Icon size={40} className="text-green-700 mb-4" />
                  <span className="text-sm md:text-base font-medium text-gray-700 text-center px-3">
                    {module.title}
                  </span>
                  {module.path && (
                    <span className="text-xs text-green-600 mt-1 font-medium">Tap to open</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}