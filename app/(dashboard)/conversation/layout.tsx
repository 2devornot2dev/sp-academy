import { PronunciationProvider } from "@/context/pronunciation-context";
import { SpeechProvider } from "@/context/speech-context";
import { MatrixProvider } from "@/context/matrix-context";

export default function ConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MatrixProvider>
    <SpeechProvider>
      <PronunciationProvider>{children}</PronunciationProvider>
    </SpeechProvider>
    </MatrixProvider>
  );
}
