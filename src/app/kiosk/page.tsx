'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function KioskPage() {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'scanning' | 'success' | 'error'>('connecting');
  const [message, setMessage] = useState('Connecting to scanner...');
  const [employeeName, setEmployeeName] = useState('');
  const [mealType, setMealType] = useState<'LUNCH' | 'OT_MEAL' | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);

  // New state for PIN mode
  const [inputMethod, setInputMethod] = useState<'scan' | 'pin'>('scan');
  const [pinCode, setPinCode] = useState('');

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
  }, [inputMethod]); // Added dependency on inputMethod

  // Reset and start new capture
  const resetAndCapture = useCallback(() => {
    setStatus('ready');
    setMessage(inputMethod === 'scan' ? 'Place your finger on the scanner' : 'Enter your PIN');
    setEmployeeName('');
    setMealType(null);
    setErrorInfo(null);
    setPinCode('');

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Start capture immediately if in scan mode
    if (inputMethod === 'scan') {
      startCapture();
    }
  }, [inputMethod]);

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
    // Only connect scan if we are in scan mode or initially connecting
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to fingerprint bridge');
        if (inputMethod === 'scan') {
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
        }
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
            // Only show error if we are specifically in scan mode looking for a finger
            if (inputMethod === 'scan') {
              showError('⏱️ Timeout', 'No finger detected. Please try again.', 1);
            }
          } else {
            if (inputMethod === 'scan') {
              showError('❌ Scan Failed', errorMsg, 2);
            }
          }
        }
      };

      ws.onerror = () => {
        console.error('WebSocket error');
        if (inputMethod === 'scan') {
          setStatus('error');
          setMessage('Scanner not available. Try PIN mode.');
        }
        // Try to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onclose = () => {
        console.warn('WebSocket closed');
        if (inputMethod === 'scan') {
          setStatus('connecting');
          setMessage('Reconnecting to scanner...');
        }
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
  }, [showError, inputMethod, startCapture]);

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

  // Verify PIN Function
  async function verifyPin() {
    if (!pinCode) return;

    try {
      setMessage('Verifying PIN...');
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode }),
      });

      const data = await response.json();

      if (response.ok && data.employee) {
        setEmployeeName(data.employee.name);
        await redeemMeal(data.employee.id, data.employee.name);
      } else {
        showError('❌ Invalid PIN', 'PIN not found. Please try again.', 2);
        setPinCode('');
      }
    } catch (error) {
      showError('❌ Error', 'Verification failed. Please try again.', 2);
      setPinCode('');
    }
  }

  // Pad Input Handler
  const handlePinInput = (digit: string) => {
    if (digit === 'DEL') {
      setPinCode(prev => prev.slice(0, -1));
    } else if (digit === 'CLEAR') {
      setPinCode('');
    } else if (pinCode.length < 6) { // Max 6 digits
      setPinCode(prev => prev + digit);
    }
  };

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
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className={`p-6 text-center text-white shrink-0 transition-colors duration-300 ${status === 'success' ? 'bg-green-500' :
          status === 'error' ? 'bg-red-500' :
            status === 'scanning' ? 'bg-blue-500' :
              'bg-gray-500'
          }`}>
          <h1 className="text-3xl font-bold">🍽️ E-Coupon</h1>
          <p className="text-sm text-white mt-1">
            {inputMethod === 'scan' ? 'Fingerprint Meal Redemption' : 'PIN Meal Redemption'}
          </p>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between">

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-start pt-4 min-h-0">
            {inputMethod === 'scan' ? (
              /* Fingerprint Canvas */
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-gray-100 p-4 rounded-2xl mb-4 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={180}
                    height={240}
                    className="border-2 border-gray-300 rounded-xl bg-white shadow-sm"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              /* PIN Pad */
              <div className="w-full max-w-[280px] flex flex-col items-center">
                <div className="mb-6 w-full">
                  <input
                    type="password"
                    value={pinCode}
                    readOnly
                    className="w-full text-center text-4xl py-4 border-2 border-gray-200 rounded-2xl bg-gray-50 tracking-[0.5em] font-bold text-gray-800 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                    placeholder="PIN"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handlePinInput(num.toString())}
                      className="h-16 text-2xl font-bold text-gray-700 bg-white border border-gray-100 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] active:bg-blue-50 active:scale-95 transition-all hover:border-blue-200"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePinInput('CLEAR')}
                    className="h-16 text-sm font-bold text-red-500 bg-red-50 border border-red-50 rounded-xl shadow-sm active:bg-red-100 active:scale-95 transition-transform"
                  >
                    CLR
                  </button>
                  <button
                    onClick={() => handlePinInput('0')}
                    className="h-16 text-2xl font-bold text-gray-700 bg-white border border-gray-100 rounded-xl shadow-sm active:bg-blue-50 active:scale-95 transition-all"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handlePinInput('DEL')}
                    className="h-16 text-xl font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl shadow-sm active:bg-gray-200 active:scale-95 transition-transform flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>
                <button
                  onClick={verifyPin}
                  disabled={!pinCode || status === 'scanning' || status === 'success'}
                  className={`mt-6 w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-all ${!pinCode || status === 'scanning' || status === 'success'
                      ? 'bg-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    }`}
                >
                  Submit PIN
                </button>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center mt-4 min-h-[5rem] flex flex-col justify-end shrink-0">
            {status === 'connecting' && inputMethod === 'scan' && (
              <div className="text-gray-800">
                <div className="text-lg font-bold animate-pulse">{message}</div>
              </div>
            )}

            {status === 'ready' && inputMethod === 'scan' && (
              <div className="text-blue-600">
                <div className="text-lg font-medium">{message}</div>
              </div>
            )}

            {status === 'scanning' && inputMethod === 'scan' && (
              <div className="text-blue-600">
                <div className="text-lg font-medium animate-pulse">{message}</div>
              </div>
            )}

            {status === 'success' && (
              <div className="text-green-600">
                <div className="text-2xl font-bold animate-bounce">{message}</div>
                {employeeName && (
                  <div className="text-lg font-medium mt-1 text-green-700">
                    {employeeName}
                  </div>
                )}
              </div>
            )}

            {status === 'error' && errorInfo && (
              <div className="text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                <div className="text-lg font-bold">{errorInfo.title}</div>
                <div className="text-sm mt-1">{errorInfo.message}</div>
              </div>
            )}

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="mt-2 text-gray-400 text-xs font-mono">
                Resetting in {countdown}s...
              </div>
            )}
          </div>

          {/* Toggle Mode Button */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center shrink-0">
            <button
              onClick={() => {
                const newMethod = inputMethod === 'scan' ? 'pin' : 'scan';
                setInputMethod(newMethod);
                // Reset status when switching
                setMessage(newMethod === 'scan' ? 'Place your finger on the scanner' : 'Enter your PIN');
                setStatus('ready');
                setErrorInfo(null);
                setPinCode('');
              }}
              className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-2 group p-2 rounded-lg hover:bg-blue-50"
            >
              {inputMethod === 'scan' ? (
                <>
                  <span className="text-xl">⌨️</span>
                  <span className="group-hover:underline">Switch to PIN Mode</span>
                </>
              ) : (
                <>
                  <span className="text-xl">👆</span>
                  <span className="group-hover:underline">Switch to Scanner Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-400 flex justify-between items-center shrink-0">
          <span>v1.0.0</span>
          <div className="space-x-4">
            <a href="/admin" className="hover:text-blue-600 transition-colors">Admin</a>
            <a href="/test-scanner" className="hover:text-blue-600 transition-colors">Debug</a>
          </div>
        </div>
      </div>
    </div>
  );
}
