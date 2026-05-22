"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Receptionist");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AUTO LOGIN
  useEffect(() => {
    const savedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");
    if (savedUser) {
      router.push("/dashboard");
    }
  }, []);

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
        if (data.message === "User not found") {
          setError("No account found with that username.");
        } else if (data.message === "Wrong password") {
          setError("Incorrect password. Please try again.");
        } else if (data.message === "Role mismatch") {
          setError("Wrong role selected for this account.");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      const userData = JSON.stringify(data.user);

      if (rememberMe) {
        localStorage.setItem("user", userData);
      } else {
        sessionStorage.setItem("user", userData);
      }

      router.push("/dashboard");

    } catch {
      setError("Connection error. Please check your internet and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eaf5ee] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-green-800 px-8 py-10 text-center">
          <Image
            src="/Images/LOGO.jpg"
            alt="Main Street Medical Center"
            width={95}
            height={95}
            className="rounded-full bg-white p-2 shadow-md mx-auto"
            priority
          />
          <h1 className="text-white text-3xl font-bold mt-5">
            Main Street Medical Center
          </h1>
          <p className="text-green-100 mt-2 text-sm">
            Electronic Health Records System
          </p>
        </div>

        {/* FORM */}
        <div className="p-8">
          <form className="space-y-5" onSubmit={handleLogin}>

            {/* ERROR BANNER */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                type="text"
                placeholder="Enter username"
                required
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  required
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pr-16 text-gray-900 bg-white focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-sm text-gray-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Login As
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 font-medium focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-200"
              >
                <option value="Receptionist">Receptionist</option>
                <option value="Administrator">Administrator</option>
                <option value="Level 1 Nurse / Midwife">Level 1 Nurse / Midwife</option>
                <option value="Lab Technician">Lab Technician</option>
                <option value="Sonographer / Radiologist">Sonographer / Radiologist</option>
                <option value="Accountant">Accountant</option>
              </select>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
              <button type="button" className="text-green-700 hover:underline">
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold text-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>

          </form>
        </div>

      </div>
    </main>
  );
}