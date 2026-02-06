'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function KioskPage() {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'scanning' | 'success' | 'error'>('connecting');
  const [message, setMessage] = useState('Connecting to scanner...');
  const [employeeName, setEmployeeName] = useState('');
  const [mealType, setMealType] = useState<'LUNCH' | 'OT_MEAL' | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const autoRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-restart after success/error
  const startAutoRestart = useCallback((delay: number) => {
    // Clear any existing timer
    if (autoRestartTimerRef.current) {
      clearTimeout(autoRestartTimerRef.current);
    }

    // Start countdown
    setCountdown(delay);
    let remaining = delay;

    const countdownInterval = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Auto-restart after delay
    autoRestartTimerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      setCountdown(null);
      resetAndCapture();
    }, delay * 1000);
  }, []);

  // Reset and start new capture
  const resetAndCapture = useCallback(() => {
    setStatus('ready');
    setMessage('Place your finger on the scanner');
    setEmployeeName('');
    setMealType(null);
    setErrorInfo(null);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Start capture immediately
    startCapture();
  }, []);

  // Start fingerprint capture
  const startCapture = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStatus('scanning');
      setMessage('Waiting for fingerprint...');
      wsRef.current.send(JSON.stringify({ type: 'capture' }));
    }
  }, []);

  // Handle error with auto-restart
  const showError = useCallback((title: string, message: string, restartDelay: number = 5) => {
    setErrorInfo({ title, message });
    setStatus('error');
    setMessage(message);
    startAutoRestart(restartDelay);
  }, [startAutoRestart]);

  // Connect to WebSocket and auto-start
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to fingerprint bridge');
        setStatus('ready');
        setMessage('Place your finger on the scanner');

        // Auto-start capture after connecting
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            setStatus('scanning');
            setMessage('Waiting for fingerprint...');
            ws.send(JSON.stringify({ type: 'capture' }));
          }
        }, 500);
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'fingerprint') {
          // Draw fingerprint image if available
          if (data.image && data.width && data.height) {
            drawFingerprintImage(data.image, data.width, data.height);
          }
          // Verify fingerprint with server
          await verifyFingerprint(data.template);
        } else if (data.type === 'error') {
          const errorMsg = data.message || 'Unknown error';

          if (errorMsg.toLowerCase().includes('no finger') || errorMsg.toLowerCase().includes('timeout')) {
            // Timeout - restart very quickly
            showError('⏱️ Timeout', 'No finger detected. Please try again.', 1);
          } else {
            showError('❌ Scan Failed', errorMsg, 2);
          }
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error');
        setStatus('error');
        setMessage('Scanner not available');
        // Try to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onclose = () => {
        console.warn('WebSocket closed');
        setStatus('connecting');
        setMessage('Reconnecting to scanner...');
        // Try to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (autoRestartTimerRef.current) {
        clearTimeout(autoRestartTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [showError]);

  function drawFingerprintImage(hexData: string, width: number, height: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < hexData.length && i / 2 < width * height; i += 2) {
      const pixelValue = parseInt(hexData.substr(i, 2), 16);
      const pixelIndex = i / 2;
      imageData.data[pixelIndex * 4] = pixelValue;
      imageData.data[pixelIndex * 4 + 1] = pixelValue;
      imageData.data[pixelIndex * 4 + 2] = pixelValue;
      imageData.data[pixelIndex * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  async function verifyFingerprint(template: string) {
    try {
      setMessage('Verifying fingerprint...');

      const response = await fetch('/api/verify-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_template: template,
          company_id: 'c0000000-0000-0000-0000-000000000001'
        })
      });

      const data = await response.json();

      if (response.ok && data.employee) {
        setEmployeeName(data.employee.name);
        await redeemMeal(data.employee.id, data.employee.name);
      } else {
        showError('❌ Not Registered', 'Fingerprint not found. Please register at HR.', 3);
      }
    } catch (error) {
      showError('❌ Error', 'Verification failed. Please try again.', 2);
    }
  }

  async function redeemMeal(employeeId: string, name: string) {
    try {
      const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          meal_type: 'LUNCH'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMealType(data.transaction.meal_type);
        setMessage(`Welcome, ${name}!`);
        // Auto-restart after 3 seconds
        startAutoRestart(3);
      } else {
        showError('⚠️ Cannot Redeem', data.error || 'Already redeemed today or not eligible.', 3);
      }
    } catch (error) {
      showError('❌ Error', 'Failed to redeem meal. Please try again.', 2);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center text-white ${status === 'success' ? 'bg-green-500' :
          status === 'error' ? 'bg-red-500' :
            status === 'scanning' ? 'bg-blue-500' :
              'bg-gray-500'
          }`}>
          <h1 className="text-3xl font-bold">🍽️ E-Coupon</h1>
          <p className="text-sm text-white mt-1">Fingerprint Meal Redemption</p>
        </div>

        <div className="p-6">
          {/* Fingerprint Canvas */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-4 rounded-2xl">
              <canvas
                ref={canvasRef}
                width={180}
                height={240}
                className="border-2 border-gray-300 rounded-xl bg-white"
                style={{ display: 'block' }}
              />
            </div>
          </div>

          {/* Status Area */}
          <div className="text-center mb-6">
            {status === 'connecting' && (
              <div className="text-gray-800">
                <div className="animate-pulse text-4xl mb-2">🔌</div>
                <div className="text-xl font-bold">{message}</div>
              </div>
            )}

            {status === 'ready' && (
              <div className="text-blue-600">
                <div className="text-6xl mb-2">👆</div>
                <div className="text-xl font-medium">{message}</div>
              </div>
            )}

            {status === 'scanning' && (
              <div className="text-blue-600">
                <div className="text-6xl mb-2 animate-pulse">🔍</div>
                <div className="text-xl font-medium">{message}</div>
                <div className="text-sm text-gray-700 mt-2">Place your finger on the scanner</div>
              </div>
            )}

            {status === 'success' && (
              <div className="text-green-600">
                <div className="text-6xl mb-2">✅</div>
                <div className="text-2xl font-bold">{message}</div>
                {employeeName && (
                  <div className="mt-4 p-4 bg-green-100 rounded-xl">
                    <div className="text-xl font-bold text-green-800">{employeeName}</div>
                    <div className="text-green-700 mt-1">
                      🍽️ {mealType === 'LUNCH' ? 'Lunch' : 'OT Meal'} Redeemed!
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && errorInfo && (
              <div className="text-red-600">
                <div className="text-6xl mb-2">
                  {errorInfo.title.includes('Timeout') ? '⏱️' : '❌'}
                </div>
                <div className="text-xl font-bold">{errorInfo.title}</div>
                <div className="text-gray-800 mt-2">{errorInfo.message}</div>
              </div>
            )}
          </div>

          {/* Countdown */}
          {countdown !== null && (
            <div className="text-center text-gray-700 text-sm font-medium">
              Restarting in {countdown} seconds...
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex justify-center mt-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${status === 'scanning' ? 'bg-blue-100 text-blue-800' :
              status === 'success' ? 'bg-green-100 text-green-800' :
                status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
              }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${status === 'scanning' ? 'bg-blue-500 animate-pulse' :
                status === 'success' ? 'bg-green-500' :
                  status === 'error' ? 'bg-red-500' :
                    'bg-gray-500'
                }`}></span>
              {status === 'connecting' ? 'Connecting...' :
                status === 'ready' ? 'Ready' :
                  status === 'scanning' ? 'Scanning...' :
                    status === 'success' ? 'Success!' :
                      'Error'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
          <a href="/admin" className="text-blue-600 hover:underline mr-3">Admin</a>
          <a href="/test-scanner" className="text-blue-600 hover:underline">Debug</a>
        </div>
      </div>
    </div>
  );
}
