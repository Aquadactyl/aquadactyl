import React from 'react';
import { useTanStackQuery } from '@/lib/queryClient';
import http from '@/api/http';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';
import TransitionRouter from '@/TransitionRouter';
import PermissionRoute from '@/components/elements/PermissionRoute';
import Can from '@/components/elements/Can';
import Spinner from '@/components/elements/Spinner';
import { NotFound } from '@/components/elements/ScreenBlock';
import { useLocation } from 'react-router';
import { useStoreState } from 'easy-peasy';
import { ServerContext } from '@/state/server';

import routes from '@/routers/routes';
import blueprintRoutes from './routes';
import { UiBadge } from '@blueprint/ui';

const blueprintExtensions = [...new Set(blueprintRoutes.server.map((route) => route.identifier))];

/**
 * Get the route egg IDs for each extension with server routes.
 */
const useExtensionEggs = () => {
    const { data } = useTanStackQuery<{ [x: string]: string[] }>(
        blueprintExtensions.length ? ['blueprint:extension-eggs', blueprintExtensions.join(',')] : null,
        async () =>
            Object.fromEntries(
                await Promise.all(
                    blueprintExtensions.map(async (id) => {
                        const response = await http.get<string[]>('/api/client/extensions/blueprint/eggs', {
                            params: { id },
                        });
                        return [id, response.data];
                    }),
                ),
            ),
        { refetchOnWindowFocus: false, staleTime: 60000 },
    );
    return (
        data ||
        blueprintExtensions.reduce<{ [x: string]: string[] }>((prev, current) => ({ ...prev, [current]: [] }), {})
    );
};

export const NavigationLinks = () => {
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const serverEgg = ServerContext.useStoreState((state) => state.server.data?.BlueprintFramework.eggId);
    const match = useRouteMatch<{ id: string }>();
    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };
    const extensionEggs = useExtensionEggs();

    return (
        <>
            {/* Aquadactyl routes */}
            {routes.server
                .filter((route) => !!route.name)
                .map((route) =>
                    route.permission ? (
                        <Can key={route.path} action={route.permission} matchAny>
                            <NavLink to={to(route.path, true)} exact={route.exact}>
                                {route.name}
                            </NavLink>
                        </Can>
                    ) : (
                        <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
                            {route.name}
                        </NavLink>
                    ),
                )}

            {/* Blueprint routes */}
            {blueprintRoutes.server.length > 0 &&
                blueprintRoutes.server
                    .filter((route) => !!route.name)
                    .filter((route) => (route.adminOnly ? rootAdmin : true))
                    .filter((route) =>
                        extensionEggs[route.identifier].includes('-1')
                            ? true
                            : extensionEggs[route.identifier].find((id) => id === serverEgg?.toString()),
                    )
                    .map((route) =>
                        route.permission ? (
                            <Can key={route.path} action={route.permission} matchAny>
                                <NavLink to={to(route.path, true)} exact={route.exact}>
                                    {route.name}
                                    {route.adminOnly ? (
                                        <>
                                            <span className={'hidden'}>(</span>
                                            <UiBadge>ADMIN</UiBadge>
                                            <span className={'hidden'}>)</span>
                                        </>
                                    ) : undefined}
                                </NavLink>
                            </Can>
                        ) : (
                            <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
                                {route.name}
                                {route.adminOnly ? (
                                    <>
                                        <span className={'hidden'}>(</span>
                                        <UiBadge>ADMIN</UiBadge>
                                        <span className={'hidden'}>)</span>
                                    </>
                                ) : undefined}
                            </NavLink>
                        ),
                    )}
        </>
    );
};

export const NavigationRouter = () => {
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const serverEgg = ServerContext.useStoreState((state) => state.server.data?.BlueprintFramework.eggId);
    const match = useRouteMatch<{ id: string }>();
    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };
    const extensionEggs = useExtensionEggs();

    const location = useLocation();
    return (
        <>
            <TransitionRouter>
                <Switch location={location}>
                    {/* Aquadactyl routes */}
                    {routes.server.map(({ path, permission, component: Component }) => (
                        <PermissionRoute key={path} permission={permission} path={to(path)} exact>
                            <Spinner.Suspense>
                                <Component />
                            </Spinner.Suspense>
                        </PermissionRoute>
                    ))}

                    {/* Blueprint routes */}
                    {blueprintRoutes.server.length > 0 &&
                        blueprintRoutes.server
                            .filter((route) => (route.adminOnly ? rootAdmin : true))
                            .filter((route) =>
                                extensionEggs[route.identifier].includes('-1')
                                    ? true
                                    : extensionEggs[route.identifier].find((id) => id === serverEgg?.toString()),
                            )
                            .map(({ path, permission, component: Component }) => (
                                <PermissionRoute key={path} permission={permission} path={to(path)} exact>
                                    <Spinner.Suspense>
                                        <Component />
                                    </Spinner.Suspense>
                                </PermissionRoute>
                            ))}

                    <Route path={'*'} component={NotFound} />
                </Switch>
            </TransitionRouter>
        </>
    );
};
