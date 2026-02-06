import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Path to the ZK9500 CLI
const CLI_PATH = path.join(process.cwd(), 'electron-bridge', 'native', 'zk9500-cli.exe');

// Default timeout for fingerprint capture (seconds)
const DEFAULT_TIMEOUT = 10;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const command = searchParams.get('command') || 'test';
    const timeout = parseInt(searchParams.get('timeout') || String(DEFAULT_TIMEOUT));

    try {
        console.log(`[TEST-SCANNER] Running command: ${command}`);
        console.log(`[TEST-SCANNER] CLI path: ${CLI_PATH}`);
        console.log(`[TEST-SCANNER] Timeout: ${timeout} seconds`);

        // Build CLI command with timeout for capture
        const cliCommand = command === 'capture'
            ? `"${CLI_PATH}" capture ${timeout}`
            : `"${CLI_PATH}" ${command}`;

        // Run the CLI with proper timeout (add buffer for overhead)
        const { stdout, stderr } = await execAsync(cliCommand, {
            timeout: (timeout + 5) * 1000, // Add 5s buffer
            windowsHide: true
        });

        console.log('[TEST-SCANNER] stdout:', stdout.substring(0, 200) + '...');
        if (stderr) {
            console.log('[TEST-SCANNER] stderr (debug log):');
            stderr.split('\n').forEach(line => {
                if (line.trim()) console.log(`  ${line}`);
            });
        }

        // Parse JSON output
        try {
            const result = JSON.parse(stdout.trim());

            // Log base64 if present (for debugging)
            if (result.templateBase64) {
                console.log('[TEST-SCANNER] ✅ Fingerprint captured!');
                console.log('[TEST-SCANNER] Template Base64 (first 100):', result.templateBase64.substring(0, 100));
            }

            return NextResponse.json({
                success: result.success !== false,
                command,
                timeout,
                result,
                debug: stderr || null
            });
        } catch {
            return NextResponse.json({
                success: false,
                command,
                timeout,
                error: 'Failed to parse CLI output',
                stdout,
                stderr
            });
        }
    } catch (error: unknown) {
        const err = error as { message?: string; stderr?: string; stdout?: string; code?: string };
        console.error('[TEST-SCANNER] Error:', err.message);

        // Try to parse stdout even on error (CLI might have returned valid JSON)
        if (err.stdout) {
            try {
                const result = JSON.parse(err.stdout.trim());
                return NextResponse.json({
                    success: false,
                    command,
                    timeout,
                    result,
                    debug: err.stderr || null
                });
            } catch {
                // Ignore parse error
            }
        }

        return NextResponse.json({
            success: false,
            command,
            timeout,
            error: err.message,
            stderr: err.stderr,
            stdout: err.stdout
        }, { status: 500 });
    }
}

