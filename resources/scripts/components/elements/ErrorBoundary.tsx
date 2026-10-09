import React from 'react';
import Icon from '@/components/elements/Icon';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface State {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
    state: State = {
        hasError: false,
    };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error(error);
    }

    render() {
        return this.state.hasError ? (
            <div className={'my-4 flex w-full items-center justify-center'}>
                <div className={'flex items-center rounded bg-neutral-900 p-3 text-red-500'}>
                    <Icon icon={faExclamationTriangle} className={'mr-2 h-4 w-auto'} />
                    <p className={'text-sm text-neutral-100'}>
                        An error was encountered by the application while rendering this view. Try refreshing the page.
                    </p>
                </div>
            </div>
        ) : (
            this.props.children
        );
    }
}

export default ErrorBoundary;
