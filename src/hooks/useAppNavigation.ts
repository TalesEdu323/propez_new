import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { APP_BASE_PATH } from '../lib/appPaths';
import { parseFluidoStep } from '../lib/parseFluidoStep';
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
  const fluidoReturn = searchParams.get('fluidoReturn');
  const fluidoStep = searchParams.get('fluidoStep');
  if (id) params.id = id;
  if (editId) params.editId = editId;
  if (postId) params.postId = postId;
  if (tab === 'loja' || tab === 'meus') params.tab = tab;
  if (targetPlan) params.targetPlan = targetPlan;
  if (fluidoReturn) params.fluidoReturn = fluidoReturn;
  const step = parseFluidoStep(fluidoStep);
  if (step != null) params.fluidoStep = step;
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
  if (params.fluidoReturn) sp.set('fluidoReturn', String(params.fluidoReturn));
  if (params.fluidoStep != null) sp.set('fluidoStep', String(params.fluidoStep));
  return sp;
}

/**
 * Navegação interna do app sincronizada com ?route= em `/app` (histórico do navegador).
 */
export function useAppNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const routerNavigate = useNavigate();
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
      const query = sp.toString();
      const target = query ? `${APP_BASE_PATH}?${query}` : APP_BASE_PATH;
      lastWrittenKey.current = `${newRoute}|${JSON.stringify(params)}`;
      syncingFromUrl.current = true;
      setRoute(newRoute);
      setRouteParams(params);

      if (!pathname.startsWith(APP_BASE_PATH)) {
        routerNavigate(target, { replace: options?.replace ?? false });
      } else {
        setSearchParams(sp, { replace: options?.replace ?? false });
      }

      queueMicrotask(() => {
        syncingFromUrl.current = false;
      });
    },
    [pathname, routerNavigate, setSearchParams],
  );

  return { route, routeParams, navigate, setRoute, setRouteParams };
}
