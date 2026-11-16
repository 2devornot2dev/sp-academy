// components/foundation/boss/picture-selector.tsx
"use client";

import type { ImageOption } from "@/context/boss-context";

interface PictureSelectorProps {
  options: ImageOption[];
  resolveAssetUrl: (key: string) => string;
  onSubmit: (answer: string) => void;
  playWord?: (phrase: string, gender?: "m" | "f") => Promise<void>;
  stopWordAudio?: () => void;
}

export function PictureSelector({
  options,
  resolveAssetUrl,
  onSubmit,
  playWord,
  stopWordAudio,
}: PictureSelectorProps) {
  const handleClick = (label: string) => {
    stopWordAudio?.();
    playWord?.(label, "m");
    onSubmit(label);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, index) => (
        <button
          key={`${option.label}-${index}`}
          type="button"
          onClick={() => handleClick(option.label)}
          className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-b-[4px] border-slate-200 border-b-slate-300 bg-white text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/40 active:translate-y-0.5 active:border-b-2"
        >
          <div className="h-28 w-full overflow-hidden bg-slate-100 sm:h-32">
            <img
              src={resolveAssetUrl(option.imageKey)}
              alt={option.label}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="border-t border-slate-100 px-3 py-2 text-center">
            <span className="text-xs font-black text-slate-800 transition-colors group-hover:text-blue-600 sm:text-sm">
              {option.label}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}