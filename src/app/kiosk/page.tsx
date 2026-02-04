'use client';

import { useState, useEffect, useRef } from 'react';

export default function KioskPage() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Place your finger on the scanner');
  const [employeeName, setEmployeeName] = useState('');
  const [mealType, setMealType] = useState<'LUNCH' | 'OT_MEAL' | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to fingerprint bridge
    const ws = new WebSocket('ws://localhost:8081');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to fingerprint bridge');
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'fingerprint') {
        // Verify fingerprint with server
        await verifyFingerprint(data.template);
      } else if (data.type === 'error') {
        setStatus('error');
        setMessage('Fingerprint scan failed: ' + data.message);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket error');
      setStatus('error');
      setMessage('Cannot connect to fingerprint scanner');
    };

    return () => {
      ws.close();
    };
  }, []);

  async function verifyFingerprint(template: string) {
    try {
      setStatus('scanning');
      setMessage('Verifying fingerprint...');

      const response = await fetch('/api/verify-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_template: template,
          company_id: 'demo-company-id'
        })
      });

      const data = await response.json();

      if (response.ok && data.employee) {
        setEmployeeName(data.employee.name);
        await redeemMeal(data.employee.id);
      } else {
        setStatus('error');
        setMessage('Employee not found. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error verifying fingerprint');
    }
  }

  async function redeemMeal(employeeId: string) {
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
        setMessage(`Meal redeemed successfully! Employee: ${data.employee.name}`);
      } else {
        setStatus('error');
        setMessage(data.error || 'Unable to redeem meal');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error redeeming meal');
    }
  }

  function handleScan() {
    if (status === 'scanning') return;

    setStatus('scanning');
    setMessage('Scanning fingerprint...');

    // Send capture command to bridge
    wsRef.current?.send(JSON.stringify({ type: 'capture' }));
  }

  function handleReset() {
    setStatus('idle');
    setMessage('Place your finger on the scanner');
    setEmployeeName('');
    setMealType(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">E-Coupon Kiosk</h1>
          <p className="mt-2 text-gray-600">Scan your fingerprint to redeem your meal</p>
        </div>

        {/* Status Display */}
        <div className="mb-8 p-6 rounded-xl bg-gray-50 text-center">
          {status === 'idle' && (
            <div className="text-gray-600">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-4.716 2.053c-.453.659-.664 1.316-.503 1.728.289.876.396 1.076.727 1.748.498 2.652-.227.914-.474 1.672-.654 2.093-.18.42-.345.972-.577 1.472-.705.498-.881.695-1.547.602-2.095.093-.412.194-.763.388-1.325.194-.562 0-1.12.473-2.093-.18-.42-.345-.972-.577-1.472-.705-.498-.881-.695-1.547-.602-2.095.093-.412.194-.763.388-1.325.194-.562 0-1.12-.473-2.093-.18-.42-.345-.972-.577-1.472-.705-.498-.881-.695-1.547-.602-2.095.093-.412.194-.763.388-1.325.194-.562 0-1.12-.473-2.093-.18-.42-.345-.972-.577-1.472-.705-.498-.881-.695-1.547-.602-2.095-.093-.412-.194-.763-.388-1.325-.194-.562 0-1.12.473-2.093.18.42.345.972.577 1.472.705.498.881.695 1.547.602 2.095-.093.412-.194.763-.388-1.325-.194-.562 0-1.12-.473-2.093.18.42.345.972.577 1.472.705.498.881.695 1.547.602 2.095.093.412.194.763.388 1.325.194.562 0 1.12.473 2.093.18.42.345.972.577 1.472.705.498.881.695 1.547.602 2.095.093.412.194.763.388 1.325.194.562 0 1.12.473 2.093-.18-.42-.345-.972-.577-1.472-.705-.498-.881-.695-1.547-.602-2.095-.093-.412-.194-.763-.388-1.325-.194-.562 0-1.12-.473-2.093-.18.42.345.972.577 1.472.705.498.881.695 1.547.602 2.095.093.412.194.763.388 1.325.194.562 0 1.12.473 2.093" />
              </svg>
              <div className="text-lg">{message}</div>
            </div>
          )}

          {status === 'scanning' && (
            <div className="text-blue-600">
              <svg className="animate-spin w-16 h-16 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-lg">Scanning...</div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-green-600">
              <svg className="w-16 h-16 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xl font-semibold">Success!</div>
              <div className="text-sm mt-2">{message}</div>
              {employeeName && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  Employee: <span className="font-semibold">{employeeName}</span>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-600">
              <svg className="w-16 h-16 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l-2 2m10-4l-2 2" />
              </svg>
              <div className="text-lg">{message}</div>
            </div>
          )}
        </div>

        {/* Scan Button */}
        {status !== 'success' && (
          <button
            onClick={handleScan}
            disabled={status === 'scanning'}
            className="w-full py-6 bg-blue-600 text-white rounded-xl text-xl font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
          >
            {status === 'scanning' ? 'Scanning...' : 'Scan Fingerprint'}
          </button>
        )}

        {/* Reset Button */}
        {status !== 'idle' && (
          <button
            onClick={handleReset}
            className="w-full mt-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Scan Another
          </button>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <a href="/admin" className="text-blue-600 hover:text-blue-700">
            Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
}
