import { useState, useMemo } from 'react';
import useVedaStore from '../../store/useVedaStore';
import { fetchFileContent } from '../../lib/github';

const C = {
    bg: "#07090f", surface: "#0d1117", border: "rgba(255,255,255,.08)",
    text: "#f8fafc", sub: "#cbd5e1", dim: "#94a3b8", muted: "#64748b",
    indigo: "#6366f1", orange: "#f97316", amber: "#fbbf24"
};

const ICONS = { python: "🐍", typescript: "💙", javascript: "🟡", json: "📋", folder: "📁" };

const getLangFromPath = (path) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map = { py: 'python', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json' };
    return map[ext] || 'plaintext';
};

// Helper to build nested tree from flat github tree
function buildTree(flatTree) {
    const root = { name: 'root', type: 'tree', children: {} };

    for (const item of flatTree) {
        const parts = item.path.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current.children[part]) {
                current.children[part] = {
                    name: part,
                    path: item.path,
                    type: i === parts.length - 1 ? (item.type === 'blob' ? 'blob' : 'tree') : 'tree',
                    children: {}
                };
            }
            current = current.children[part];
        }
    }
    return root;
}

// Recursive Node Component
function TreeNode({ node, depth, activeFile, openFiles, gitChanges, onFileClick, addToast }) {
    const [isOpen, setIsOpen] = useState(depth === 0); // Open root by default

    const isFolder = node.type === 'tree';
    const isActive = activeFile === node.path;
    const isModified = !!gitChanges[node.path];

    const handleClick = (e) => {
        e.stopPropagation();
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onFileClick(node.path);
        }
    };

    const children = Object.values(node.children || {}).sort((a, b) => {
        // Sort folders first, then files alphabetically
        if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    if (node.name === 'root') {
        return <>{children.map(child => <TreeNode key={child.path} node={child} depth={depth} activeFile={activeFile} openFiles={openFiles} gitChanges={gitChanges} onFileClick={onFileClick} addToast={addToast} />)}</>;
    }

    return (
        <div>
            <div
                onClick={handleClick}
                style={{
                    padding: `4px 8px`,
                    paddingLeft: `${10 + depth * 14}px`,
                    display: "flex", alignItems: "center", gap: 6,
                    margin: "1px 0", cursor: "pointer",
                    background: isActive ? "rgba(99,102,241,.13)" : "transparent",
                    color: isActive ? C.text : C.sub
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.03)" }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent" }}
            >
                {isFolder ? (
                    <>
                        <span style={{ fontSize: 9, color: C.dim, minWidth: 8 }}>{isOpen ? "▾" : "▸"}</span>
                        <span style={{ color: C.orange }}>{ICONS.folder}</span>
                        <span style={{ marginLeft: 2, fontSize: 11.5 }}>{node.name}</span>
                    </>
                ) : (
                    <>
                        <span style={{ minWidth: 12, display: "inline-block", textAlign: "center", visibility: 'hidden' }}></span>
                        <span style={{ fontSize: 13 }}>{ICONS[getLangFromPath(node.name)] || "📄"}</span>
                        <span style={{ fontSize: 11.5, color: isActive ? C.text : C.sub }}>{node.name}</span>
                        {isModified && <span style={{ marginLeft: "auto", fontSize: 14, color: C.amber, lineHeight: 1 }}>•</span>}
                    </>
                )}
            </div>

            {isFolder && isOpen && (
                <div>
                    {children.map(child => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            activeFile={activeFile}
                            openFiles={openFiles}
                            gitChanges={gitChanges}
                            onFileClick={onFileClick}
                            addToast={addToast}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Main Component
export default function FileTree({ addToast }) {
    const { fileTree, activeFile, openFiles, gitChanges, activeRepo, updateFileContent, setActiveFile } = useVedaStore();

    const nestedTree = useMemo(() => buildTree(fileTree || []), [fileTree]);

    const handleFileClick = async (path) => {
        // If it's already in open files, just set it active
        if (openFiles[path]) {
            setActiveFile(path);
            return;
        }

        // Need to fetch from GitHub
        if (!activeRepo) return;

        try {
            addToast("Loading...", `Fetching ${path.split('/').pop()}`, "info");
            const content = await fetchFileContent(activeRepo.owner, activeRepo.name, path);

            // Update store: add to openFiles and set active
            updateFileContent(path, content);

            // Remove it from gitChanges if it was just loaded (updateFileContent unfortunately marks it as changed if repo is active, so we have to manually unstage it inside store or here. Actually, we should fix the store to not do this for the initial load, but for now we'll un-mark it.)
            useVedaStore.setState(s => {
                const changes = { ...s.gitChanges };
                delete changes[path];
                return { gitChanges: changes };
            });

            setActiveFile(path);
        } catch (err) {
            console.error(err);
            addToast("Failed to load file", err.message, "error");
        }
    };

    if (!activeRepo) {
        return (
            <div style={{ padding: 20, textAlign: "center", color: C.dim, fontFamily: "Syne", fontSize: 12 }}>
                No repository loaded.<br /><br />Go to the GitHub tab to load a workspace.
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "JetBrains Mono", overflowY: 'auto' }}>
            <div style={{ padding: "8px 12px", fontSize: 10, color: C.dim, letterSpacing: ".05em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, marginBottom: 4, fontWeight: 700 }}>
                {activeRepo.name}
            </div>
            <TreeNode
                node={nestedTree}
                depth={0}
                activeFile={activeFile}
                openFiles={openFiles}
                gitChanges={gitChanges}
                onFileClick={handleFileClick}
                addToast={addToast}
            />
        </div>
    );
}
