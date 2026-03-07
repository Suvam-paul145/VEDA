import { useState } from 'react';
import useVedaStore from '../../store/useVedaStore';
import { pushChanges } from '../../lib/github';

const C = {
    bg: "#07090f", surface: "#0d1117", border: "rgba(255,255,255,.08)",
    text: "#f8fafc", sub: "#cbd5e1", dim: "#94a3b8", muted: "#64748b",
    indigo: "#6366f1", violet: "#8b5cf6", amber: "#fbbf24", green: "#10b981",
};

export default function SourceControl({ addToast }) {
    const { activeRepo, gitChanges, clearGitChanges } = useVedaStore();
    const [message, setMessage] = useState('');
    const [committing, setCommitting] = useState(false);

    const changesList = Object.keys(gitChanges);

    const handleCommit = async () => {
        if (!message.trim() || changesList.length === 0 || !activeRepo) return;

        setCommitting(true);
        addToast("Committing...", `Pushing ${changesList.length} files to ${activeRepo.name}`, "info");

        try {
            await pushChanges(
                activeRepo.owner,
                activeRepo.name,
                activeRepo.default_branch,
                gitChanges,
                message
            );

            clearGitChanges();
            setMessage('');
            addToast("Success!", `Changes pushed to ${activeRepo.default_branch}`, "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to push", err.message, "error");
        } finally {
            setCommitting(false);
        }
    };

    if (!activeRepo) {
        return (
            <div style={{ padding: 20, textAlign: "center", color: C.dim, fontFamily: "Syne", fontSize: 12 }}>
                No repository active to track changes.
            </div>
        );
    }

    return (
        <div style={{ padding: 12, fontFamily: "Syne", display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginBottom: 10 }}>
                Changes ({changesList.length})
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
                {changesList.length === 0 ? (
                    <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                        No pending changes. Load a file from the explorer and edit it.
                    </div>
                ) : (
                    changesList.map(filePath => (
                        <div key={filePath} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, marginBottom: 4, cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(251,191,36,.14)", border: "1px solid rgba(251,191,36,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.amber }}>M</span>
                            <span style={{ fontSize: 11, color: C.sub, fontFamily: "JetBrains Mono", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={filePath}>
                                {filePath}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: "auto" }}>
                <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Commit message"
                    disabled={changesList.length === 0 || committing}
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: C.text, fontFamily: "Syne", outline: "none", marginBottom: 10 }}
                />
                <button
                    onClick={handleCommit}
                    disabled={changesList.length === 0 || !message.trim() || committing}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 9, background: changesList.length > 0 && message.trim() ? `linear-gradient(135deg,${C.indigo},${C.violet})` : C.surface, border: "none", color: changesList.length > 0 && message.trim() ? "white" : C.dim, fontFamily: "Syne", fontWeight: 600, fontSize: 12, cursor: changesList.length > 0 && message.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                    {committing ? <><div style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Pushing…</> : <>✓ Commit & Push</>}
                </button>
            </div>
        </div>
    );
}
