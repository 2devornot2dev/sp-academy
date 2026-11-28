"use client";

import { motion } from "framer-motion";

interface QuestionProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function Question({
  icon,
  eyebrow,
  title,
  description,
  children,
}: QuestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl"
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-blue-600">
          {icon}
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-600">
          {eyebrow}
        </p>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-gray-500">
          {description}
        </p>
      </div>

      <div className="mt-10">{children}</div>
    </motion.div>
  );
}