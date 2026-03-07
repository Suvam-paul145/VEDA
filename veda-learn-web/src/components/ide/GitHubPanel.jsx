import { useState } from "react";
import useVedaStore from "../../store/useVedaStore";
import { initGithub, fetchRepos, fetchRepoTree } from "../../lib/github";

const C = {
    bg: "#07090f", surface: "#0d1117", border: "rgba(255,255,255,.08)",
    text: "#f8fafc", sub: "#cbd5e1", dim: "#94a3b8", muted: "#64748b",
    indigo: "#6366f1", violet: "#8b5cf6", green: "#10b981", amber: "#fbbf24", red: "#ef4444"
};

const LANG_COLORS = { JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", default: "#ccc" };

export default function GitHubPanel({ onConnected, addToast }) {
    const { githubToken, githubUser, repos, activeRepo, setGithubAuth, setRepos, setActiveRepo } = useVedaStore();

    const [tokenInput, setTokenInput] = useState(githubToken || "");
    const [connecting, setConnecting] = useState(false);
    const [loadingRepo, setLoadingRepo] = useState(null);

    const handleConnect = async () => {
        if (!tokenInput.trim()) return;
        setConnecting(true);
        try {
            const user = await initGithub(tokenInput.trim());
            setGithubAuth(tokenInput.trim(), user);

            const userRepos = await fetchRepos();
            setRepos(userRepos);

            addToast("GitHub connected", `${user.login} · ${userRepos.length} repos loaded`, "success");
            onConnected?.();
        } catch (err) {
            addToast("Connection failed", err.message, "error");
        } finally {
            setConnecting(false);
        }
    };

    const loadRepository = async (repo) => {
        if (loadingRepo) return;
        setLoadingRepo(repo.name);
        try {
            const tree = await fetchRepoTree(repo.owner.login, repo.name, repo.default_branch);
            setActiveRepo(
                { owner: repo.owner.login, name: repo.name, default_branch: repo.default_branch },
                tree
            );
            addToast("Repository loaded", `${repo.name} loaded into the explorer`, "success");

            // Auto switch to explorer tab
            useVedaStore.getState().setSidebarTab("explorer");
        } catch (err) {
            console.error(err);
            addToast("Failed to load generic files", err.message, "error");
        } finally {
            setLoadingRepo(null);
        }
    };

    if (!githubUser) return (
        <div style={{ padding: 14, fontFamily: "Syne" }}>
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginBottom: 14, lineHeight: 1.6 }}>
                Connect GitHub to browse repos and load files into the IDE.
            </div>
            <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>Personal Access Token</div>
                <input
                    value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleConnect()}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.text, fontFamily: "JetBrains Mono", outline: "none", transition: "border-color .2s", marginBottom: 8 }}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,.45)"}
                    onBlur={e => e.target.style.borderColor = C.border}
                />
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono", marginBottom: 10 }}>
                    Needs <code style={{ color: C.sub }}>repo</code> (read/write) scope to be able to push changes
                </div>
                <button onClick={handleConnect} disabled={!tokenInput.trim() || connecting}
                    style={{ width: "100%", padding: "9px 0", borderRadius: 9, background: tokenInput.trim() ? `linear-gradient(135deg,${C.indigo},${C.violet})` : C.surface, border: `1px solid ${tokenInput.trim() ? "transparent" : C.border}`, color: "white", fontFamily: "Syne", fontWeight: 700, fontSize: 12, cursor: tokenInput.trim() ? "pointer" : "default", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    {connecting
                        ? <><div style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Connecting…</>
                        : <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                            Connect GitHub
                        </>}
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Syne" }}>
            {/* User badge */}
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <img src={githubUser.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{githubUser.login}</div>
                    <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{repos.length} repos loaded</div>
                </div>
            </div>

            {/* Repo list */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                {repos.map(repo => {
                    const isActive = activeRepo?.name === repo.name && activeRepo?.owner === repo.owner.login;
                    const isLoading = loadingRepo === repo.name;

                    return (
                        <div key={repo.id} className="gh-repo"
                            style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, background: isActive ? "rgba(99,102,241,.08)" : "transparent", cursor: "pointer", position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                {repo.private
                                    ? <span style={{ fontSize: 9, color: C.amber, background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.25)", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono" }}>private</span>
                                    : <span style={{ fontSize: 9, color: C.green, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.2)", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono" }}>public</span>}
                                <span style={{ flex: 1, fontSize: 12, color: isActive ? C.indigo : C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={repo.name}>
                                    {repo.name}
                                </span>
                                <span style={{ fontSize: 9, color: C.dim, fontFamily: "JetBrains Mono" }}>⭐ {repo.stargazers_count}</span>
                            </div>
                            <div style={{ fontSize: 10, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }} title={repo.description}>{repo.description || "No description"}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[repo.language] || LANG_COLORS.default, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{repo.language || "Mixed"}</span>
                                <span style={{ marginLeft: "auto", fontSize: 9, color: C.muted, fontFamily: "JetBrains Mono" }}>{new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>

                            {/* Load button */}
                            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => loadRepository(repo)}
                                    disabled={isActive || isLoading}
                                    style={{ padding: "4px 10px", borderRadius: 6, background: isActive ? C.surface : `linear-gradient(135deg,${C.indigo},${C.violet})`, border: `1px solid ${isActive ? C.border : 'transparent'}`, color: isActive ? C.dim : "white", fontFamily: "Syne", fontWeight: 600, fontSize: 10, cursor: isActive ? "default" : "pointer" }}>
                                    {isLoading ? "Loading..." : isActive ? "Loaded ✓" : "Load Workspace"}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
