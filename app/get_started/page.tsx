"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function GetStartedPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match. Please try again.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        username,
        password,
        securityQuestion,
        securityAnswer,
      }),
    });

    const data = await response.json();

    if (data.success) {
      setStatus("success");
      setMessage(
        "System initialized successfully! Your administrator account has been created. You can now log in and assign roles to your staff."
      );
    } else {
      setStatus("error");
      // Show the actual message from the server
      if (data.message === "Username already exists") {
        setMessage(
          "An administrator account already exists. The system has already been initialized. Please go to the login page."
        );
      } else {
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f5] flex items-center justify-center px-6 py-10">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-green-800 px-10 py-10 text-center">
          <div className="flex justify-center">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              width={100}
              height={100}
              className="rounded-full bg-white p-2 shadow-md"
              priority
            />
          </div>
          <h1 className="text-white text-3xl font-bold mt-5">System Setup</h1>
          <p className="text-green-100 mt-3 text-sm">
            Create the first administrator account to begin using Main Street EMR.
          </p>
        </div>

        {/* Form */}
        <div className="p-10">

          {/* SUCCESS SCREEN */}
          {status === "success" && (
            <div className="text-center py-10">
              <div className="flex justify-center mb-6">
                <div className="bg-green-100 rounded-full p-5">
                  <svg className="w-12 h-12 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                System Initialized!
              </h2>
              <p className="text-gray-600 mb-2">{message}</p>
              <p className="text-gray-500 text-sm mb-8">
                A confirmation email has been sent to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="bg-green-800 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* ERROR BANNER */}
          {status === "error" && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-700 text-sm font-medium">{message}</p>
                {message.includes("already exists") && (
                  <button
                    onClick={() => router.push("/login")}
                    className="mt-2 text-green-700 text-sm font-semibold underline"
                  >
                    Go to Login →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* FORM — hide after success */}
          {status !== "success" && (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Administrator Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter administrator name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              {/* Administrator Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Administrator Email
                </label>
                <input
                  type="email"
                  placeholder="Enter administrator email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              {/* Administrator Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Administrator Username
                </label>
                <input
                  type="text"
                  placeholder="Create username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-green-700 font-medium"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              {/* Security Question */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Security Question
                </label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-700"
                >
                  <option value="">Choose a security question</option>
                  <option>What is the name of my medical center?</option>
                </select>
              </div>

              {/* Security Answer */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Security Answer
                </label>
                <input
                  type="text"
                  placeholder="Enter answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-green-800 hover:bg-green-700 disabled:bg-green-400 text-white py-4 rounded-xl font-semibold text-lg transition"
              >
                {status === "loading" ? "Initializing..." : "Initialize System"}
              </button>

            </form>
          )}

        </div>
      </div>
    </main>
  );
}