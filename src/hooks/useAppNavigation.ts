import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AppRoute, NavigateFn, RouteParams } from '../types/navigation';

const DEFAULT_ROUTE: AppRoute = 'dashboard';

function paramsFromSearchParams(searchParams: URLSearchParams): {
  route: AppRoute;
  params: RouteParams;
} {
  const route = (searchParams.get('route') as AppRoute | null) || DEFAULT_ROUTE;
  const params: RouteParams = {};
  const id = searchParams.get('id');
  const editId = searchParams.get('editId');
  const tab = searchParams.get('tab');
  const postId = searchParams.get('postId');
  const targetPlan = searchParams.get('targetPlan');
  if (id) params.id = id;
  if (editId) params.editId = editId;
  if (postId) params.postId = postId;
  if (tab === 'loja' || tab === 'meus') params.tab = tab;
  if (targetPlan) params.targetPlan = targetPlan;
  return { route, params };
}

function searchParamsFromRoute(route: AppRoute, params: RouteParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (route !== DEFAULT_ROUTE) sp.set('route', route);
  if (params.id) sp.set('id', String(params.id));
  if (params.editId) sp.set('editId', String(params.editId));
  if (params.postId) sp.set('postId', String(params.postId));
  if (params.tab) sp.set('tab', params.tab);
  if (params.targetPlan) sp.set('targetPlan', String(params.targetPlan));
  return sp;
}

/**
 * Navegação interna do app sincronizada com ?route= na URL (histórico do navegador).
 */
export function useAppNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingFromUrl = useRef(false);
  const lastWrittenKey = useRef('');

  const initial = paramsFromSearchParams(searchParams);
  const [route, setRoute] = useState<AppRoute>(initial.route);
  const [routeParams, setRouteParams] = useState<RouteParams>(initial.params);

  const urlKey = searchParams.toString();

  useEffect(() => {
    if (syncingFromUrl.current) return;
    const { route: urlRoute, params: urlParams } = paramsFromSearchParams(searchParams);
    const paramsKey = JSON.stringify(urlParams);
    const key = `${urlRoute}|${paramsKey}`;
    if (key === lastWrittenKey.current) return;

    setRoute(urlRoute);
    setRouteParams(urlParams);
  }, [urlKey, searchParams]);

  const navigate: NavigateFn = useCallback(
    (newRoute, params = {}, options?: { replace?: boolean }) => {
      const sp = searchParamsFromRoute(newRoute, params);
      lastWrittenKey.current = `${newRoute}|${JSON.stringify(params)}`;
      syncingFromUrl.current = true;
      setRoute(newRoute);
      setRouteParams(params);
      setSearchParams(sp, { replace: options?.replace ?? false });
      queueMicrotask(() => {
        syncingFromUrl.current = false;
      });
    },
    [setSearchParams],
  );

  return { route, routeParams, navigate, setRoute, setRouteParams };
}
