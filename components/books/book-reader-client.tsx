// components/books/book-reader-client.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  BookWrapper,
  type BookWrapperProps,
} from "../spoon-books/book-wrapper";
import { saveBookProgress } from "@/app/actions/book-actions";
import { PronunciationProvider } from "@/context/pronunciation-context"; // adjust path if yours lives elsewhere

type ClientProps = Omit<BookWrapperProps, "onBackToLibrary" | "onSaveProgress">;

export function BookReaderClient(props: ClientProps) {
  const router = useRouter();

  return (
    <PronunciationProvider>
      <BookWrapper
        {...props}
        onBackToLibrary={() => router.push("/books")}
        onSaveProgress={saveBookProgress}
      />
    </PronunciationProvider>
  );
}