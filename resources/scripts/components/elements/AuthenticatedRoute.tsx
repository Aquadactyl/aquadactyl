import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAppStore } from '@/state';

export default ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAppStore((state) => !!state.user.data?.uuid);
    const location = useLocation();

    return isAuthenticated ? <>{children}</> : <Navigate to={'/auth/login'} state={{ from: location }} replace />;
};
