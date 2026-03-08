import { Octokit } from '@octokit/rest';

let octokit = null;

export const initGithub = async (token) => {
    octokit = new Octokit({ auth: token });
    try {
        const { data } = await octokit.rest.users.getAuthenticated();
        return data;
    } catch {
        octokit = null;
        throw new Error('Invalid GitHub token or failed to authenticate.');
    }
};

export const fetchRepos = async () => {
    if (!octokit) throw new Error('GitHub not initialized');
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50
    });
    return data;
};

export const fetchRepoTree = async (owner, repo, branch = 'main') => {
    if (!octokit) throw new Error('GitHub not initialized');

    // First get the branch to find its commit SHA
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
    });

    // Get the complete tree recursively
    const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: refData.object.sha,
        recursive: '1'
    });

    return treeData.tree;
};

export const fetchFileContent = async (owner, repo, path) => {
    if (!octokit) throw new Error('GitHub not initialized');
    const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path
    });

    // Decode Base64 content
    return decodeURIComponent(escape(atob(data.content)));
};

export const pushChanges = async (owner, repo, branch = 'main', files, message) => {
    if (!octokit) throw new Error('GitHub not initialized');

    // 1. Get current commit
    const { data: refData } = await octokit.rest.git.getRef({
        owner, repo, ref: `heads/${branch}`
    });
    const commitSha = refData.object.sha;

    const { data: commitData } = await octokit.rest.git.getCommit({
        owner, repo, commit_sha: commitSha
    });
    const baseTreeSha = commitData.tree.sha;

    // 2. Create blobs for new file contents
    const newTreeItems = await Promise.all(
        Object.entries(files).map(async ([path, content]) => {
            const { data: blobData } = await octokit.rest.git.createBlob({
                owner, repo, content, encoding: 'utf-8'
            });
            return {
                path,
                mode: '100644',
                type: 'blob',
                sha: blobData.sha
            };
        })
    );

    // 3. Create a new tree
    const { data: newTree } = await octokit.rest.git.createTree({
        owner, repo, tree: newTreeItems, base_tree: baseTreeSha
    });

    // 4. Create new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
        owner, repo, message, tree: newTree.sha, parents: [commitSha]
    });

    // 5. Update reference
    await octokit.rest.git.updateRef({
        owner, repo, ref: `heads/${branch}`, sha: newCommit.sha
    });

    return newCommit;
};
