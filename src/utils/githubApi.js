/**
 * GitHub API utility for fetching repository metadata.
 * Uses the public GitHub REST API (no auth required, 60 req/hr rate limit).
 */

/**
 * Parse a GitHub URL and extract owner and repo name.
 * Supports formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - github.com/owner/repo
 *   - http://github.com/owner/repo
 */
export function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Add protocol if missing
  let normalized = trimmed;
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes('github.com')) return null;

    // Remove leading slash and .git suffix
    const pathname = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length < 2) return null;

    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * Fetch repository data from the GitHub public API.
 * Returns a clean object with relevant fields or throws an error.
 */
export async function fetchRepoData(owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  });

  if (response.status === 404) {
    throw new Error('Repository not found. Please check the URL.');
  }

  if (response.status === 403) {
    throw new Error('API rate limit exceeded. Please try again later.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}). Please try again.`);
  }

  const data = await response.json();

  return {
    name: data.name || '',
    description: data.description || '',
    owner: data.owner?.login || '',
    license: data.license?.spdx_id || '',
    homepage: data.homepage || '',
    language: data.language || '',
    topics: data.topics || [],
    html_url: data.html_url || '',
  };
}
