import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const COMMANDS = {
    help: () => 'veda-learn terminal v1.0.0\nAvailable commands:\n  help    - Show this help message\n  clear   - Clear the terminal screen\n  echo    - Print arguments\n  whoami  - Print current user\n  date    - Print current date/time',
    clear: (term) => term.clear(),
    whoami: () => 'veda_dev',
    date: () => new Date().toString(),
    echo: (args) => args.join(' ')
};

export default function TerminalPanel() {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            fontFamily: 'JetBrains Mono, consolas, monospace',
            fontSize: 13,
            lineHeight: 1.2,
            theme: {
                background: '#0d1117',
                foreground: '#e2e8f0',
                cursor: '#6366f1',
                selectionBackground: 'rgba(99, 102, 241, 0.3)',
            },
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[38;2;99;102;241mWelcome to Veda Learn Integrated Terminal\x1b[0m');
        term.writeln('Type "help" for a list of mock commands.');
        term.write('\r\n$ ');

        let command = '';

        // Handle input
        term.onData((data) => {
            const code = data.charCodeAt(0);

            // Enter key
            if (code === 13) {
                term.write('\r\n');

                const args = command.trim().split(/\s+/);
                const cmd = args[0].toLowerCase();

                if (cmd) {
                    if (COMMANDS[cmd]) {
                        const result = cmd === 'clear'
                            ? COMMANDS[cmd](term)
                            : COMMANDS[cmd](args.slice(1));

                        if (result) {
                            term.writeln(result);
                        }
                    } else {
                        term.writeln(`bash: ${cmd}: command not found`);
                    }
                }

                command = '';
                term.write('$ ');
            }
            // Backspace
            else if (code === 127) {
                if (command.length > 0) {
                    command = command.slice(0, -1);
                    term.write('\b \b');
                }
            }
            // Printable characters
            else if (code >= 32 && code <= 126) {
                command += data;
                term.write(data);
            }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            try {
                fitAddon.fit();
            } catch (err) {
                console.warn('Resize observer err:', err);
            }
        });

        resizeObserver.observe(terminalRef.current);

        return () => {
            resizeObserver.disconnect();
            term.dispose();
        };
    }, []);

    return (
        <div
            ref={terminalRef}
            style={{
                height: '100%',
                width: '100%',
                padding: '10px 14px',
                overflow: 'hidden',
                background: '#0d1117'
            }}
        />
    );
}
