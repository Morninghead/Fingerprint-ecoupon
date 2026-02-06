// ZK9500 CLI Integration for Fingerprint Bridge
// Switches between hybrid-mock and real scanner CLI

const { spawn } = require('child_process');
const path = require('path');

class ZK9500CLI {
    constructor() {
        this.cliPath = path.join(__dirname, 'native', 'zk9500-cli.exe');
    }

    async test() {
        return this.runCommand('test');
    }

    async capture() {
        return this.runCommand('capture');
    }

    runCommand(command) {
        return new Promise((resolve, reject) => {
            console.log(`[ZK9500-CLI] Running: ${command}`);

            const process = spawn(this.cliPath, [command]);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('[ZK9500-CLI]', data.toString().trim());
            });

            process.on('close', (code) => {
                // Extract JSON from stdout (SDK may add debug messages after JSON)
                const extractJSON = (str) => {
                    const jsonMatch = str.match(/^\s*(\{[\s\S]*?\})\s*/);
                    if (jsonMatch) return jsonMatch[1];
                    // Try to find first { to last }
                    const start = str.indexOf('{');
                    const end = str.lastIndexOf('}');
                    if (start !== -1 && end !== -1 && end > start) {
                        return str.substring(start, end + 1);
                    }
                    return str.trim();
                };

                const jsonStr = extractJSON(stdout);

                if (code === 0) {
                    try {
                        const result = JSON.parse(jsonStr);
                        console.log('[ZK9500-CLI] Success:', result);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Failed to parse CLI output: ' + stdout));
                    }
                } else {
                    // CLI returned non-zero exit code (error/timeout)
                    try {
                        const errorResult = JSON.parse(jsonStr);
                        // Use the descriptive message from CLI
                        const errorMsg = errorResult.message || errorResult.error || 'Capture failed';
                        console.log('[ZK9500-CLI] Error:', errorMsg);
                        reject(new Error(errorMsg));
                    } catch (e) {
                        reject(new Error('CLI failed with code ' + code + ': ' + stdout));
                    }
                }
            });

            process.on('error', (err) => {
                reject(new Error('Failed to spawn CLI: ' + err.message));
            });
        });
    }
}

module.exports = ZK9500CLI;
