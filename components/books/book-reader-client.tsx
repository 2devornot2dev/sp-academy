// components/books/book-reader-client.tsx
"use client";

import { useRouter } from "next/navigation";
import { BookWrapper, type BookWrapperProps } from "../spoon-books/book-wrapper";
import { saveBookProgress } from "@/app/actions/book-actions";


type ClientProps = Omit<BookWrapperProps, "onBackToLibrary" | "onSaveProgress">;

export function BookReaderClient(props: ClientProps) {
  const router = useRouter();

  return (
    <BookWrapper
      {...props}
      onBackToLibrary={() => router.push("/books")}
      onSaveProgress={saveBookProgress}
    />
  );
}