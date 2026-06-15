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
  const [showAlreadyInitializedPopup, setShowAlreadyInitializedPopup] = useState(false);

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
        "Your administrator account has been created successfully. You can now log in and assign roles to your staff."
      );
    } else {
      if (data.message === "System already initialized") {
        setStatus("idle");
        setShowAlreadyInitializedPopup(true);
      } else if (data.message === "Username already exists") {
        setStatus("error");
        setMessage("This username is already taken. Please choose a different one.");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f5] flex items-center justify-center px-4 py-10">

      {/* ALREADY INITIALIZED POPUP */}
      {showAlreadyInitializedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 rounded-full p-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              System Already Set Up
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              This system has already been initialized. An administrator account already exists. Please log in to continue.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-base transition mb-3"
            >
              Go to Login →
            </button>
            <button
              onClick={() => setShowAlreadyInitializedPopup(false)}
              className="w-full text-gray-400 text-sm py-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-green-800 px-8 py-10 text-center">
          <div className="flex justify-center">
            <Image
              src="/Images/LOGO.jpg"
              alt="Main Street Medical Center"
              width={90}
              height={90}
              className="rounded-full bg-white p-2 shadow-md"
              priority
            />
          </div>
          <h1 className="text-white text-2xl font-bold mt-5">System Setup</h1>
          <p className="text-green-100 mt-2 text-sm">
            Create the first administrator account to begin using Main Street EMR.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-10">

          {/* SUCCESS SCREEN */}
          {status === "success" && (
            <div className="text-center py-8">
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
              <p className="text-gray-600 mb-4 leading-relaxed">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 text-left">
                <p className="text-green-800 text-sm font-semibold mb-1">📧 Check your email</p>
                <p className="text-green-700 text-sm">
                  A confirmation has been sent to <strong>{email}</strong> with your account details.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-green-800 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-lg transition"
              >
                Go to Login →
              </button>
            </div>
          )}

          {/* ERROR BANNER */}
          {status === "error" && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm font-medium">{message}</p>
            </div>
          )}

          {/* FORM */}
          {status !== "success" && (
            <form onSubmit={handleSubmit} className="space-y-5">

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