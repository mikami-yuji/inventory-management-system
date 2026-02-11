"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API interfaces
interface IWindow extends Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
}

export function useVoiceInput(options?: {
    onResult?: (text: string) => void;
    onError?: (error: any) => void;
    lang?: string;
}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    // Initialize recognition
    useEffect(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as IWindow;
        const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

        if (SpeechRecognitionConstructor) {
            const recognition = new SpeechRecognitionConstructor();
            recognition.continuous = false; // Stop after one sentence for simple input
            recognition.interimResults = true;
            recognition.lang = options?.lang || "ja-JP";

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const current = event.resultIndex;
                const transcriptResult = event.results[current][0].transcript;

                setTranscript(transcriptResult);

                // Final result
                if (event.results[current].isFinal && options?.onResult) {
                    // Normalize numbers (e.g. "５個" -> "5")
                    const normalized = transcriptResult.replace(/[０-９]/g, (s: string) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                        .replace(/[^0-9]/g, ''); // Extract numbers only if intention is quantity?

                    // Let the caller handle normalization, just return text
                    options.onResult(transcriptResult);
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setError(event.error);
                setIsListening(false);
                if (options?.onError) options.onError(event.error);
            };

            recognitionRef.current = recognition;
        } else {
            setError("Browser does not support speech recognition.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                setTranscript("");
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        hasSupport: !!(typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
    };
}
