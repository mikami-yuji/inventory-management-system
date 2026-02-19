'use client';

import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

const qrcodeRegionId = "html5qr-code-full-region";

interface BarcodeScannerProps {
    fps?: number;
    qrbox?: number;
    aspectRatio?: number;
    disableFlip?: boolean;
    verbose?: boolean;
    qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void;
    qrCodeErrorCallback?: (errorMessage: string) => void;
}

export const BarcodeScanner = (props: BarcodeScannerProps) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Prevent re-initialization if already active
        // Note: Strict Mode mounts twice, but cleanup clears it.
        // However, clear() is async, so race conditions can occur.
        // A simple flag helps.

        let isMounted = true;

        if (!scannerRef.current) {
            const config = {
                fps: props.fps || 10,
                qrbox: props.qrbox || 250,
                aspectRatio: props.aspectRatio || 1.0,
                disableFlip: props.disableFlip || false,
                // 外カメラ（背面カメラ）を優先的に使用
                videoConstraints: {
                    facingMode: { ideal: "environment" },
                },
            };

            // Use verbose mode only if specified
            const verbose = props.verbose === true;

            const scanner = new Html5QrcodeScanner(
                qrcodeRegionId,
                config,
                verbose
            );

            scanner.render(
                (decodedText, decodedResult) => {
                    if (isMounted) {
                        props.qrCodeSuccessCallback(decodedText, decodedResult);
                    }
                },
                (errorMessage) => {
                    if (isMounted && props.qrCodeErrorCallback) {
                        props.qrCodeErrorCallback(errorMessage);
                    }
                }
            );

            scannerRef.current = scanner;
        }

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
                scannerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div id={qrcodeRegionId} className="w-full max-w-sm mx-auto overflow-hidden rounded-lg shadow-md" />
    );
};
