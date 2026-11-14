"use client";

import Link from "next/link";
import Image from "next/image";
import { footerConfig } from "./landing-page-config";

export default function FooterSection() {
  return (
    <footer className="relative bg-linear-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-6 py-12 md:py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 gap-8 md:gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 text-center md:text-left">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <Image
                src="/logo1.png"
                alt="Spoon Academy Logo"
                width={200}
                height={200}
                className="rounded-lg"
              />

            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto md:mx-0">
              {footerConfig.brand.description}
            </p>
            
            {/* Social Links */}
            {/* <div className="flex gap-4 mt-6 justify-center md:justify-start">
              {footerConfig.social.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xl transition-all hover:scale-110 hover:bg-linear-to-r hover:from-sky-400 hover:to-emerald-400"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div> */}
          </div>

          {/* Links Columns - Hidden on mobile except legal */}
          {Object.entries(footerConfig.links).map(([key, section]) => (
            <div key={key} className="hidden md:block">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile Legal Links */}
        <div className="mt-8 flex justify-center gap-6 md:hidden">
          <Link
            href="/privacy"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-400">•</span>
          <Link
            href="/terms"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          >
            Terms of Service
          </Link>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col items-center justify-center gap-2 md:flex-row md:justify-between md:gap-4">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
              © {footerConfig.copyright.year} {footerConfig.copyright.text}
            </p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500">
              Made with 💖 for families everywhere
            </p>
          </div>
        </div>
      </div>

      {/* Gradient Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-sky-400 via-emerald-400 to-purple-400" />
    </footer>
  );
}