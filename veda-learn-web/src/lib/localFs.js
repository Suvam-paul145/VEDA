export async function openLocalDirectory() {
    if (!window.showDirectoryPicker) {
        throw new Error("Your browser does not support the File System Access API. Please use Chrome or Edge.");
    }

    const dirHandle = await window.showDirectoryPicker({
        mode: "readwrite"
    });

    const tree = [];

    async function walk(handle, path) {
        for await (const entry of handle.values()) {
            // Ignore .git and node_modules, but allow other dotfiles (e.g. .env)
            if (entry.name === '.git' || entry.name === 'node_modules') continue;

            const fullPath = path ? `${path}/${entry.name}` : entry.name;

            if (entry.kind === 'file') {
                tree.push({ path: fullPath, type: 'blob', handle: entry });
            } else if (entry.kind === 'directory') {
                tree.push({ path: fullPath, type: 'tree', handle: entry });
                await walk(entry, fullPath);
            }
        }
    }

    await walk(dirHandle, "");
    return { name: dirHandle.name, tree, handle: dirHandle };
}

export async function readLocalFile(handle) {
    const file = await handle.getFile();
    return await file.text();
}

export async function writeLocalFile(handle, content) {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
}
