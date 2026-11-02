import React from "react";
import Link from "next/link";
export default function page() {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4 text-center">
      <h1 className="text-4xl font-bold text-red-500">Access Denied</h1>
      <p className="text-lg text-gray-600">
        You do not have permission to view this page.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        Return to Home!
      </Link>
    </div>
  );
}
