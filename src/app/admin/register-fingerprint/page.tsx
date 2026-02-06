'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type Employee = {
    id: string;
    name: string;
    pin: string;
    fingerprint_template: string | null;
};

export default function RegisterFingerprintPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('Select an employee to register fingerprint');
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Load employees
    useEffect(() => {
        loadEmployees();
    }, []);

    async function loadEmployees() {
        const { data } = await supabase
            .from('employees')
            .select('id, name, pin, fingerprint_template')
            .order('name');

        setEmployees(data || []);
    }

    // Connect to WebSocket
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket('ws://localhost:8081');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to fingerprint bridge');
            setWsConnected(true);
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'fingerprint') {
                // Draw fingerprint image
                if (data.image && data.width && data.height) {
                    drawFingerprintImage(data.image, data.width, data.height);
                }

                // Save fingerprint to database
                if (selectedEmployee && data.template) {
                    await saveFingerprint(selectedEmployee.id, data.template);
                }
            } else if (data.type === 'error') {
                setStatus('error');
                setMessage(data.message || 'Scan failed');
            }
        };

        ws.onerror = () => {
            setWsConnected(false);
        };

        ws.onclose = () => {
            setWsConnected(false);
            // Auto-reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    }, [selectedEmployee]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

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

    async function saveFingerprint(employeeId: string, template: string) {
        try {
            const response = await fetch('/api/register-fingerprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employeeId,
                    fingerprint_template: template
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setStatus('success');
                setMessage(`✅ Fingerprint registered for ${selectedEmployee?.name}!`);
                // Reload employees to update status
                loadEmployees();
                // Reset after 3 seconds
                setTimeout(() => {
                    setStatus('idle');
                    setSelectedEmployee(null);
                    setMessage('Select an employee to register fingerprint');
                    clearCanvas();
                }, 3000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to save fingerprint');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Error saving fingerprint');
        }
    }

    function clearCanvas() {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    function handleSelectEmployee(employee: Employee) {
        setSelectedEmployee(employee);
        setStatus('idle');
        setMessage(`Selected: ${employee.name}. Click "Scan Fingerprint" to register.`);
        clearCanvas();
    }

    function handleStartScan() {
        if (!selectedEmployee) {
            setMessage('Please select an employee first');
            return;
        }

        if (!wsConnected) {
            setMessage('Scanner not connected. Please check the bridge.');
            return;
        }

        setStatus('scanning');
        setMessage(`Scanning fingerprint for ${selectedEmployee.name}...`);

        // Send capture command
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'capture' }));
        }
    }

    async function handleRemoveFingerprint(employee: Employee) {
        if (!confirm(`Remove fingerprint for ${employee.name}?`)) return;

        try {
            const response = await fetch(`/api/register-fingerprint?employee_id=${employee.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadEmployees();
                setMessage(`Fingerprint removed for ${employee.name}`);
            }
        } catch (error) {
            console.error('Error removing fingerprint:', error);
        }
    }

    const employeesWithFingerprint = employees.filter(e => e.fingerprint_template);
    const employeesWithoutFingerprint = employees.filter(e => !e.fingerprint_template);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">👆 Fingerprint Registration</h1>
                    <p className="text-gray-600 mt-2">Register employee fingerprints for the E-Coupon system</p>
                    <div className="mt-2">
                        <a href="/admin/employees" className="text-blue-600 hover:underline text-sm">
                            ← Back to Employee Management
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Employee List */}
                    <div className="space-y-6">
                        {/* Employees without fingerprint */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                📋 Employees Without Fingerprint ({employeesWithoutFingerprint.length})
                            </h2>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {employeesWithoutFingerprint.map(emp => (
                                    <button
                                        key={emp.id}
                                        onClick={() => handleSelectEmployee(emp)}
                                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${selectedEmployee?.id === emp.id
                                            ? 'bg-blue-100 border-2 border-blue-500'
                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-medium">{emp.name}</div>
                                            <div className="text-sm text-gray-700">PIN: {emp.pin}</div>
                                        </div>
                                        <span className="text-red-500 text-sm">Not registered</span>
                                    </button>
                                ))}
                                {employeesWithoutFingerprint.length === 0 && (
                                    <div className="text-gray-700 text-center py-4">
                                        All employees have fingerprints registered! 🎉
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Employees with fingerprint */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                ✅ Registered Employees ({employeesWithFingerprint.length})
                            </h2>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {employeesWithFingerprint.map(emp => (
                                    <div
                                        key={emp.id}
                                        className="px-4 py-3 bg-green-50 rounded-lg flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-medium text-green-800">{emp.name}</div>
                                            <div className="text-sm text-green-600">PIN: {emp.pin}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSelectEmployee(emp)}
                                                className="text-blue-600 text-sm hover:underline"
                                            >
                                                Re-register
                                            </button>
                                            <button
                                                onClick={() => handleRemoveFingerprint(emp)}
                                                className="text-red-600 text-sm hover:underline"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Scanner Panel */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        {/* Connection Status */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">🔍 Scanner</h2>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                <span className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'
                                    }`}></span>
                                {wsConnected ? 'Connected' : 'Disconnected'}
                            </div>
                        </div>

                        {/* Selected Employee */}
                        {selectedEmployee && (
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                                <div className="text-sm text-blue-600">Selected Employee:</div>
                                <div className="font-bold text-blue-900 text-lg">{selectedEmployee.name}</div>
                            </div>
                        )}

                        {/* Fingerprint Canvas */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-gray-100 p-4 rounded-xl">
                                <canvas
                                    ref={canvasRef}
                                    width={200}
                                    height={260}
                                    className="border-2 border-gray-300 rounded-lg bg-white"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className={`text-center mb-6 p-4 rounded-lg ${status === 'success' ? 'bg-green-100 text-green-800' :
                            status === 'error' ? 'bg-red-100 text-red-800' :
                                status === 'scanning' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-700'
                            }`}>
                            {status === 'scanning' && (
                                <div className="animate-pulse text-2xl mb-2">🔍</div>
                            )}
                            <div className="font-medium">{message}</div>
                        </div>

                        {/* Scan Button */}
                        <button
                            onClick={handleStartScan}
                            disabled={!selectedEmployee || !wsConnected || status === 'scanning'}
                            className="w-full py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {status === 'scanning' ? '⏳ Scanning...' : '👆 Scan Fingerprint'}
                        </button>

                        {!wsConnected && (
                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                                ⚠️ Scanner not connected. Make sure the fingerprint bridge is running.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
