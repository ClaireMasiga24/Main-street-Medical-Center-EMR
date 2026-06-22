"use client";

import { ROLE_ROUTES } from "../lib/roleRoutes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🚨 NO AUTO REDIRECT HERE (IMPORTANT FIX)
  // Login page must always be accessible

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      const user = data.user;
      const userData = JSON.stringify(user);

      // save session — always clear the other storage to prevent stale data
      if (rememberMe) {
        sessionStorage.removeItem("user");
        localStorage.setItem("user", userData);
      } else {
        localStorage.removeItem("user");
        sessionStorage.setItem("user", userData);
      }

      // clean role-based routing
      const route = ROLE_ROUTES[user.role];
      router.replace(route || "/");

    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#eaf5ee] to-white px-4">

      <div className="w-full max-w-md">

        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* HEADER */}
          <div className="bg-green-800 px-6 py-8 text-center">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              width={80}
              height={80}
              className="rounded-full bg-white p-2 mx-auto"
              priority
            />

            <h1 className="text-white text-2xl font-bold mt-4">
              Main Street EMR
            </h1>

            <p className="text-green-100 text-sm mt-1">
              Secure Staff Login
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin} className="p-6 space-y-5">

            {/* ERROR */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* USERNAME */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="Enter username"
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>

              <div className="relative mt-1">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-16 focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="Enter password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-sm text-gray-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* ROLE */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Login Role
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="NURSE_MIDWIFE">Nurse/Midwife</option>
                <option value="DOCTOR">Doctor</option>
                <option value="LAB_TECHNICIAN">Lab Technician</option>
                <option value="RADIOLOGIST_SONOGRAPHER">Radiologist/Sonographer</option>
                <option value="DENTIST">Dentist</option>
              </select>
            </div>

            {/* REMEMBER */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </div>

            {/* BUTTON */}
            <button
              disabled={loading}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Secure EMR System • Mobile First Design
        </p>

      </div>

    </main>
  );
}