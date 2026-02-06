'use client';

import { useState, useEffect, useRef } from 'react';

export default function TestScannerPage() {
    const [status, setStatus] = useState<'connecting' | 'ready' | 'scanning' | 'success' | 'error'>('connecting');
    const [message, setMessage] = useState('Connecting to scanner...');
    const [debug, setDebug] = useState<string[]>([]);
    const [templateBase64, setTemplateBase64] = useState<string>('');
    const wsRef = useRef<WebSocket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const addDebug = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDebug(prev => [...prev, `${time} - ${msg}`]);
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    function connectWebSocket() {
        addDebug('Connecting to bridge...');
        const ws = new WebSocket('ws://localhost:8081');
        wsRef.current = ws;

        ws.onopen = () => {
            addDebug('✅ Connected to scanner bridge!');
            setStatus('ready');
            setMessage('Scanner Ready - Click Capture');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'fingerprint') {
                addDebug('🎉 FINGERPRINT CAPTURED!');
                addDebug(`Template: ${data.template?.length || 0} chars`);

                // Convert hex template to base64
                if (data.template) {
                    const base64 = hexToBase64(data.template);
                    setTemplateBase64(base64);
                    addDebug(`Base64: ${base64.substring(0, 50)}...`);
                }

                // Draw fingerprint image
                if (data.image && data.width && data.height) {
                    addDebug(`Image: ${data.width}x${data.height}`);
                    drawFingerprint(data.image, data.width, data.height);
                }

                setStatus('success');
                setMessage('✅ Fingerprint Captured!');
            } else if (data.type === 'error') {
                addDebug(`❌ Error: ${data.message}`);
                setStatus('error');
                setMessage(`Error: ${data.message}`);
            }
        };

        ws.onerror = () => {
            addDebug('❌ Connection failed!');
            setStatus('error');
            setMessage('Cannot connect to bridge. Is it running?');
        };

        ws.onclose = () => {
            addDebug('Disconnected');
        };
    }

    function hexToBase64(hex: string): string {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    function drawFingerprint(hexData: string, width: number, height: number) {
        const canvas = canvasRef.current;
        if (!canvas) {
            addDebug('Canvas not found!');
            return;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            addDebug('Cannot get canvas context!');
            return;
        }

        addDebug(`Drawing image ${width}x${height}...`);

        const imageData = ctx.createImageData(width, height);
        for (let i = 0; i < hexData.length && i / 2 < width * height; i += 2) {
            const pixelValue = parseInt(hexData.substr(i, 2), 16);
            const pixelIndex = i / 2;
            imageData.data[pixelIndex * 4] = pixelValue;     // R
            imageData.data[pixelIndex * 4 + 1] = pixelValue; // G
            imageData.data[pixelIndex * 4 + 2] = pixelValue; // B
            imageData.data[pixelIndex * 4 + 3] = 255;        // A (fully opaque)
        }
        ctx.putImageData(imageData, 0, 0);
        addDebug('✅ Image drawn!');
    }

    function capture() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addDebug('Not connected!');
            return;
        }

        setStatus('scanning');
        setMessage('👆 Place finger on scanner...');
        addDebug('Sending capture command...');
        wsRef.current.send(JSON.stringify({ type: 'capture' }));
    }

    function reconnect() {
        if (wsRef.current) wsRef.current.close();
        setDebug([]);
        connectWebSocket();
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1 style={{ fontSize: '28px', marginBottom: '20px', color: '#333' }}>
                🔬 ZK9500 Scanner Test
            </h1>

            {/* Status */}
            <div style={{
                padding: '20px',
                marginBottom: '20px',
                borderRadius: '10px',
                backgroundColor: status === 'success' ? '#d4edda' :
                    status === 'error' ? '#f8d7da' :
                        status === 'scanning' ? '#fff3cd' : '#e7f1ff',
                border: `2px solid ${status === 'success' ? '#28a745' :
                    status === 'error' ? '#dc3545' :
                        status === 'scanning' ? '#ffc107' : '#007bff'}`,
                color: '#333',
                fontSize: '20px',
                fontWeight: 'bold'
            }}>
                {message}
            </div>

            {/* Buttons */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={capture}
                    disabled={status === 'scanning' || status === 'connecting'}
                    style={{
                        padding: '15px 30px',
                        fontSize: '18px',
                        backgroundColor: status === 'scanning' ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: status === 'scanning' ? 'not-allowed' : 'pointer'
                    }}
                >
                    {status === 'scanning' ? '⏳ Scanning...' : '📸 Capture Fingerprint'}
                </button>

                <button
                    onClick={reconnect}
                    style={{
                        padding: '15px 30px',
                        fontSize: '18px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Reconnect
                </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Fingerprint Image */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    flex: '0 0 350px'
                }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
                        📷 Fingerprint Image
                    </h2>
                    <div style={{
                        backgroundColor: '#eee',
                        padding: '10px',
                        borderRadius: '5px',
                        display: 'inline-block'
                    }}>
                        <canvas
                            ref={canvasRef}
                            width={300}
                            height={400}
                            style={{
                                border: '2px solid #333',
                                backgroundColor: 'white',
                                display: 'block'
                            }}
                        />
                    </div>
                </div>

                {/* Debug Log */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    flex: '1',
                    minWidth: '400px'
                }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
                        📝 Debug Log
                    </h2>
                    <div style={{
                        backgroundColor: '#1a1a2e',
                        color: '#00ff00',
                        padding: '15px',
                        borderRadius: '5px',
                        height: '400px',
                        overflowY: 'auto',
                        fontFamily: 'Consolas, monospace',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}>
                        {debug.length === 0 ? (
                            <div style={{ color: '#666' }}>Waiting for events...</div>
                        ) : (
                            debug.map((msg, i) => (
                                <div key={i} style={{
                                    color: msg.includes('✅') || msg.includes('🎉') ? '#00ff00' :
                                        msg.includes('❌') ? '#ff4444' :
                                            msg.includes('Base64') ? '#00ffff' :
                                                '#ffffff',
                                    marginBottom: '5px'
                                }}>
                                    {msg}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Base64 Template */}
            {templateBase64 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    marginTop: '20px'
                }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
                        🔐 Template Base64
                    </h2>
                    <textarea
                        readOnly
                        value={templateBase64}
                        style={{
                            width: '100%',
                            height: '100px',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '12px',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            backgroundColor: '#f8f9fa'
                        }}
                    />
                </div>
            )}
        </div>
    );
}
