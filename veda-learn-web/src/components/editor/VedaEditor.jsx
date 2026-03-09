import { useRef, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import useVedaStore from '../../store/useVedaStore';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../lib/api';
import RateLimitIndicator from '../ui/RateLimitIndicator';

// ─── Language detection by filename ──────────────────────────
const detectLanguage = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const MAP = {
        py: 'python', ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript', json: 'json',
        md: 'markdown', sh: 'shell', yaml: 'yaml', yml: 'yaml',
    };
    return MAP[ext] || 'plaintext';
};

// ─── Veda dark theme definition ──────────────────────────────
const VEDA_THEME = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8b5cf6', fontStyle: 'bold' },
        { token: 'string', foreground: '10b981' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '06b6d4' },
        { token: 'function', foreground: '6366f1' },
        { token: 'identifier', foreground: 'e2e8f0' },
    ],
    colors: {
        'editor.background': '#07090f',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#0d1117',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#6366f1',
        'editor.selectionBackground': '#6366f130',
        'editor.findMatchBackground': '#fbbf2430',
        'editorCursor.foreground': '#6366f1',
        'editorGutter.background': '#07090f',
        'scrollbarSlider.background': '#6366f120',
    },
};

// ─── Options object (extracted to avoid re-creation) ─────────
const EDITOR_OPTIONS = {
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    fontSize: 13,
    lineHeight: 21,
    minimap: { enabled: false },        // we render our own minimap
    scrollBeyondLastLine: false,
    wordWrap: 'off',
    renderWhitespace: 'selection',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'gutter',
    contextmenu: true,
    quickSuggestions: false,                     // disable autocomplete noise
    formatOnPaste: false,
    tabSize: 4,
    padding: { top: 14, bottom: 14 },
};

// ─── Main component ───────────────────────────────────────────
export default function VedaEditor({ style, activeFile, code, language, onCodeChange }) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorRef = useRef([]);

    const setAnalyzing = useVedaStore(s => s.setAnalyzing);
    const setLastAnalysis = useVedaStore(s => s.setLastAnalysis);
    const addNotification = useVedaStore(s => s.addNotification);

    const [localCode, setLocalCode] = useState(code);
    const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

    // Sync when activeFile changes
    const prevFileRef = useRef(activeFile);
    if (prevFileRef.current !== activeFile) {
        prevFileRef.current = activeFile;
        setLocalCode(code);
    }

    // ── Analysis runner (used by debounce & manual triggers) ──
    const runAnalysis = useCallback(async (content, { silent = false } = {}) => {
        // Check if we can analyze (not in cooldown)
        if (!api.canAnalyze()) {
            const cooldownTime = api.getCooldownTime();
            console.log(`[VedaEditor] Skipping analysis - ${cooldownTime}s cooldown remaining`);
            // Only show notification for manual triggers, not for auto-debounced ones
            if (!silent && addNotification) {
                addNotification({
                    type: 'info',
                    title: 'Analysis cooldown',
                    body: `Please wait ${cooldownTime} seconds before analyzing again`
                });
            }
            return;
        }

        setAnalyzing(true);
        try {
            const data = await api.analyze({
                fileContent: content,
                language: language,
                fileName: activeFile,
                cursorLine: editorRef.current?.getPosition()?.lineNumber ?? 1,
            });
            if (data.teach) {
                setLastAnalysis(data);
                if (addNotification) {
                    addNotification({
                        type: 'success',
                        title: 'Pattern detected',
                        body: `Found ${data.conceptId?.replace(/-/g, ' ')} at line ${data.lineNumber}`
                    });
                }
            } else if (!silent && addNotification) {
                addNotification({
                    type: 'info',
                    title: 'Analysis complete',
                    body: 'No issues detected in your code'
                });
            }
        } catch (err) {
            console.error('[VedaEditor] Analysis error:', err);
            
            // Handle rate limiting errors gracefully
            if (err.message.includes('wait') || err.message.includes('Rate limited')) {
                // Set rate limit timer for UI feedback
                const cooldownTime = api.getCooldownTime();
                if (cooldownTime > 0) {
                    setRateLimitedUntil(Date.now() + (cooldownTime * 1000));
                }
                if (!silent && addNotification) {
                    addNotification({
                        type: 'warning',
                        title: 'Rate limited',
                        body: err.message
                    });
                }
            } else if (!silent) {
                if (addNotification) {
                    addNotification({
                        type: 'error',
                        title: 'Analysis failed',
                        body: 'Unable to analyze code. Please try again later.'
                    });
                }
            }
        } finally {
            setAnalyzing(false);
        }
    }, [activeFile, language, setAnalyzing, setLastAnalysis, addNotification]);

    // Auto-analysis: silent (no notification spam for cooldowns)
    const silentRunAnalysis = useCallback(
        (content) => runAnalysis(content, { silent: true }),
        [runAnalysis]
    );

    useDebounce(silentRunAnalysis, localCode, 45_000);

    // ── Error marker decoration ───────────────────────────────
    const addErrorMarker = useCallback((lineNumber) => {
        if (!editorRef.current || !monacoRef.current) return;
        const monaco = monacoRef.current;

        // Remove old decorations
        decorRef.current = editorRef.current.deltaDecorations(decorRef.current, [
            {
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: {
                    isWholeLine: true,
                    className: 'veda-error-line',
                    glyphMarginClassName: 'veda-error-glyph',
                    overviewRuler: {
                        color: '#ef4444',
                        position: monaco.editor.OverviewRulerLane.Left,
                    },
                    minimap: { color: '#ef4444', position: 1 },
                },
            },
        ]);

        // Monaco model markers (shows in Problems tab)
        monaco.editor.setModelMarkers(editorRef.current.getModel(), 'veda', [
            {
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: 999,
                message: 'Veda detected a learning opportunity here',
                severity: monaco.MarkerSeverity.Warning,
                source: 'Veda',
            },
        ]);
    }, []);

    // ── Mount handler ─────────────────────────────────────────
    const handleMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Register custom theme
        monaco.editor.defineTheme('veda-dark', VEDA_THEME);
        monaco.editor.setTheme('veda-dark');

        // Subscribe to lesson events from store
        const unsubscribe = useVedaStore.subscribe((state) => {
            const lesson = state.currentLesson;
            if (lesson?.lineNumber) addErrorMarker(lesson.lineNumber);
        });

        // Cmd/Ctrl+Enter shortcut → force immediate analysis
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => runAnalysis(editor.getValue())
        );

        // Add custom event listener for IDEPage "Analyze" button
        const handleForceAnalyze = () => runAnalysis(editor.getValue());
        window.addEventListener('veda-force-analyze', handleForceAnalyze);

        // Clean up subscription on dispose
        editor.onDidDispose(() => {
            unsubscribe();
            window.removeEventListener('veda-force-analyze', handleForceAnalyze);
        });
    };

    // ── Change handler ────────────────────────────────────────
    const handleChange = (value = '') => {
        setLocalCode(value);
        onCodeChange?.(value);
    };

    return (
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', ...style }}>
            {/* Rate limit indicator */}
            <div style={{ 
                position: 'absolute', 
                top: 8, 
                right: 12, 
                zIndex: 10,
                background: 'rgba(7, 9, 15, 0.8)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
                <RateLimitIndicator />
            </div>
            
            <MonacoEditor
                height="100%"
                language={detectLanguage(activeFile)}
                value={localCode}
                theme="veda-dark"
                options={EDITOR_OPTIONS}
                onMount={handleMount}
                onChange={handleChange}
                loading={
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '100%', color: '#6366f1', fontFamily: 'JetBrains Mono', fontSize: 13
                    }}>
                        Loading Monaco…
                    </div>
                }
            />

            {/* Error line CSS injected once */}
            <style>{`
        .veda-error-line   { background: rgba(239,68,68,.06) !important; }
        .veda-error-glyph  { background: #ef4444; width: 4px !important; margin-left: 3px; border-radius: 2px; }
      `}</style>
        </div>
    );
}
