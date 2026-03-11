"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Web Speech API interfaces
type SpeechRecognitionResult = {
    isFinal: boolean;
    [index: number]: {
        transcript: string;
    };
}

type SpeechRecognitionResultList = {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

type SpeechRecognitionEvent = Event & {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

type SpeechRecognitionErrorEvent = Event & {
    error: string;
    message: string;
}

type SpeechRecognition = EventTarget & {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

type SpeechRecognitionConstructor = {
    new(): SpeechRecognition;
}

type IWindow = Window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
}

export function useVoiceInput(options?: {
    onResult?: (text: string) => void;
    onError?: (error: string) => void;
    lang?: string;
}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Initialize recognition
    useEffect(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
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

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const current = event.resultIndex;
                const result = event.results[current];
                const transcriptResult = result[0].transcript;

                setTranscript(transcriptResult);

                // Final result
                if (result.isFinal && options?.onResult) {
                    options.onResult(transcriptResult);
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error", event.error);
                setError(event.error);
                setIsListening(false);
                if (options?.onError) options.onError(event.error);
            };

            recognitionRef.current = recognition;
        } else {
            // Using a timeout to move the state update out of the synchronous effect body
            setTimeout(() => {
                if (recognitionRef.current === null) {
                    setError("Browser does not support speech recognition.");
                }
            }, 0);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [options?.lang, options?.onResult, options?.onError]);

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
        hasSupport: typeof window !== 'undefined' && !!((window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition)
    };
}
