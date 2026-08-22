import { useEffect, useState } from 'react';

export type GithubRepoStats = {
  stars: number;
  forks: number;
  openIssues: number;
  updatedAt: string;
  url: string;
};

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: GithubRepoStats };

export function useGithubRepo(repoSlug: string | undefined): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!repoSlug) {
      setState({ status: 'error', message: 'Repositorio no disponible' });
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading' });

    fetch(`https://api.github.com/repos/${repoSlug}`, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 403) throw new Error('Límite de peticiones a GitHub alcanzado, intenta más tarde');
          throw new Error(`GitHub respondió con estado ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        setState({
          status: 'success',
          data: {
            stars: json.stargazers_count,
            forks: json.forks_count,
            openIssues: json.open_issues_count,
            updatedAt: json.pushed_at,
            url: json.html_url,
          },
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error.message ?? 'No se pudo cargar la información de GitHub' });
      });

    return () => controller.abort();
  }, [repoSlug]);

  return state;
}
