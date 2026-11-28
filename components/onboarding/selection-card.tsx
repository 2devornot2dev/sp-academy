"use client";

import { Check } from "lucide-react";

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SelectionCard({ selected, onClick, children }: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200 ${
        selected
          ? "border-blue-500 bg-sky-50 shadow-md shadow-sky-500/10"
          : "border-gray-100 bg-white shadow-xs hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
      }`}
    >
      {children}

      <div
        className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
          selected ? "bg-blue-600 text-white" : "border-2 border-gray-200"
        }`}
      >
        {selected && <Check className="h-4 w-4 stroke-3" />}
      </div>
    </button>
  );
}