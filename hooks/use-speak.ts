"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useSpeak() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const operationIdRef = useRef(0);
  const mountedRef = useRef(true);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    operationIdRef.current += 1;

    abortRef.current?.abort();
    abortRef.current = null;

    readerRef.current?.cancel().catch(() => {});
    readerRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    revokeObjectUrl();
    if (mountedRef.current) {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [revokeObjectUrl]);

  useEffect(() => {
    mountedRef.current = true;
    const audio = new Audio();
    audioRef.current = audio;

    const onPlay = () => {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsPlaying(true);
      }
    };
    const onEnded = () => {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsPlaying(false);
      }
    };
    const onPause = () => {
      if (mountedRef.current) setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);

    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;

      abortRef.current?.abort();
      abortRef.current = null;

      readerRef.current?.cancel().catch(() => {});
      readerRef.current = null;

      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      revokeObjectUrl();
      audioRef.current = null;
    };
  }, [revokeObjectUrl]);

  const speak = useCallback(
    async (
      text: string,
      targetLanguage: string,
      speed: number = 0.9,
      gender?: "male" | "female",
    ) => {
      stop();

      const operationId = operationIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      const isCurrent = () =>
        mountedRef.current &&
        operationId === operationIdRef.current &&
        !controller.signal.aborted;

      try {
        if (mountedRef.current) setIsLoading(true);

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            language: targetLanguage,
            speed,
            gender,
          }),
          signal: controller.signal,
        });

        if (!isCurrent()) return;
        if (!response.ok) throw new Error("Failed to generate speech");
        if (!response.body) throw new Error("No stream body");

        const audio = audioRef.current;
        if (!audio) return;

        const mimeType = "audio/mpeg";
        const canStreamMse =
          typeof MediaSource !== "undefined" &&
          MediaSource.isTypeSupported(mimeType);

        if (canStreamMse) {
          const mediaSource = new MediaSource();
          const streamUrl = URL.createObjectURL(mediaSource);
          objectUrlRef.current = streamUrl;
          audio.src = streamUrl;

          await new Promise<void>((resolve, reject) => {
            const onOpen = () => {
              cleanup();
              resolve();
            };
            const onAbort = () => {
              cleanup();
              reject(new DOMException("Aborted", "AbortError"));
            };
            const cleanup = () => {
              mediaSource.removeEventListener("sourceopen", onOpen);
              controller.signal.removeEventListener("abort", onAbort);
            };
            mediaSource.addEventListener("sourceopen", onOpen, { once: true });
            controller.signal.addEventListener("abort", onAbort, { once: true });
          });

          if (!isCurrent()) return;

          const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
          const reader = response.body.getReader();
          readerRef.current = reader;

          const queue: Uint8Array[] = [];
          let streamDone = false;

          const drainQueue = () => {
            if (!isCurrent() || sourceBuffer.updating) return;

            if (queue.length > 0) {
              const chunk = queue.shift()!;
              try {
                sourceBuffer.appendBuffer(chunk as BufferSource);
              } catch (err) {
                console.error("MSE append error:", err);
                streamDone = true;
                reader.cancel().catch(() => {});
                try {
                  mediaSource.endOfStream();
                } catch {}
              }
              return;
            }

            if (streamDone && mediaSource.readyState === "open") {
              try {
                mediaSource.endOfStream();
              } catch {}
            }
          };

          sourceBuffer.addEventListener("updateend", drainQueue);

          if (mountedRef.current) setIsLoading(false);
          audio.play().catch(() => {});

          try {
            while (isCurrent() && !streamDone) {
              const { done, value } = await reader.read();
              if (!isCurrent()) break;
              if (done) {
                streamDone = true;
                drainQueue();
                break;
              }
              queue.push(value);
              drainQueue();
            }
          } finally {
            sourceBuffer.removeEventListener("updateend", drainQueue);
            if (readerRef.current === reader) readerRef.current = null;
          }
        } else {
          const audioBlob = await response.blob();
          if (!isCurrent()) return;

          const blobUrl = URL.createObjectURL(audioBlob);
          objectUrlRef.current = blobUrl;
          audio.src = blobUrl;

          if (mountedRef.current) setIsLoading(false);
          await audio.play();
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("TTS Error:", error);
        }
        if (isCurrent()) {
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    },
    [stop],
  );

  return { speak, stop, isPlaying, isLoading };
}