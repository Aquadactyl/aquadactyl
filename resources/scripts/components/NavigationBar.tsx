import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, LogOut, Server, Settings } from 'lucide-react';
import { useAppStore } from '@/state';
import SearchContainer from '@/components/dashboard/search/SearchContainer';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import Avatar from '@/components/Avatar';

import BeforeNavigation from '@blueprint/components/Navigation/NavigationBar/BeforeNavigation';
import AdditionalItems from '@blueprint/components/Navigation/NavigationBar/AdditionalItems';
import AfterNavigation from '@blueprint/components/Navigation/NavigationBar/AfterNavigation';

export default () => {
    const name = useAppStore((state) => state.settings.data!.name);
    const logoUrl = useAppStore((state) => state.settings.data?.logoUrl);
    const showNameWithLogo = useAppStore((state) => state.settings.data?.showNameWithLogo);
    const pairedLogo = Boolean(logoUrl && showNameWithLogo);
    const user = useAppStore((state) => state.user.data!);
    const isAquadactyl = name.trim().toLowerCase() === 'aquadactyl';
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const onTriggerLogout = () => {
        setIsLoggingOut(true);
        http.post('/auth/logout').finally(() => window.location.assign('/'));
    };

    return (
        <header className={'panel-navigation'} id={'NavigationBar'}>
            <BeforeNavigation />
            <SpinnerOverlay visible={isLoggingOut} />
            <div className={'navigation-inner'}>
                <div id={'logo'} className={'navigation-brand' + (pairedLogo ? ' navigation-brand-with-name' : '')}>
                    <Link to={'/'} aria-label={name + ' home'} className={pairedLogo ? 'brand-with-name' : undefined}>
                        {logoUrl ? (
                            <>
                                <img className={'custom-site-logo'} src={logoUrl} alt={''} />
                                {showNameWithLogo && (
                                    <span className={'custom-site-name'} title={name}>
                                        {name}
                                    </span>
                                )}
                            </>
                        ) : isAquadactyl ? (
                            <img src={'/branding/aquadactyl-wordmark.png'} alt={''} />
                        ) : (
                            <>
                                <img className={'brand-emblem'} src={'/branding/aquadactyl-emblem.png'} alt={''} />
                                <span>{name}</span>
                            </>
                        )}
                    </Link>
                </div>
                <nav className={'navigation-items'} aria-label={'Main navigation'}>
                    <NavLink to={'/'} exact id={'NavigationDashboard'} aria-label={'Servers'}>
                        <Server size={17} aria-hidden />
                        <span>Servers</span>
                    </NavLink>
                    {user.rootAdmin && (
                        <a href={'/admin'} id={'NavigationAdmin'} aria-label={'Administration'}>
                            <Settings size={17} aria-hidden />
                            <span>Admin</span>
                            <ArrowUpRight size={12} className={'navigation-external'} aria-hidden />
                        </a>
                    )}
                    <AdditionalItems />
                    <SearchContainer />
                    <NavLink to={'/account'} id={'NavigationAccount'} aria-label={'Account settings'}>
                        <span className={'navigation-avatar'}>
                            <Avatar.User size={23} />
                        </span>
                        <span>Account</span>
                        <span className={'navigation-username'}>{user.username}</span>
                    </NavLink>
                    <Tooltip placement={'bottom'} content={'Sign out'}>
                        <button
                            type={'button'}
                            onClick={onTriggerLogout}
                            disabled={isLoggingOut}
                            id={'NavigationLogout'}
                            aria-label={'Sign out'}
                            className={'navigation-logout'}
                        >
                            <LogOut size={17} aria-hidden />
                        </button>
                    </Tooltip>
                </nav>
            </div>
            <AfterNavigation />
        </header>
    );
};
