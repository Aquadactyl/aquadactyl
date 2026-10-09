import React, { createRef } from 'react';
import classNames from 'classnames';
import Fade from '@/components/elements/Fade';

interface Props {
    children: React.ReactNode;
    renderToggle: (onClick: (e: React.MouseEvent<any, MouseEvent>) => void) => React.ReactChild;
}

export const DropdownButtonRow: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }> = ({
    danger,
    className,
    ...props
}) => (
    <button
        className={classNames(
            'flex w-full cursor-pointer items-center rounded p-2 text-neutral-200 transition-all duration-150 ease-linear',
            danger ? 'hover:bg-red-900 hover:text-red-200' : 'hover:bg-neutral-600 hover:text-neutral-50',
            className,
        )}
        {...props}
    />
);

interface State {
    posX: number;
    visible: boolean;
}

class DropdownMenu extends React.PureComponent<Props, State> {
    menu = createRef<HTMLDivElement>();

    state: State = {
        posX: 0,
        visible: false,
    };

    componentWillUnmount() {
        this.removeListeners();
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>) {
        const menu = this.menu.current;

        if (this.state.visible && !prevState.visible && menu) {
            menu.style.left = `${Math.round(this.state.posX - menu.clientWidth)}px`;
            requestAnimationFrame(() => {
                if (this.state.visible) {
                    document.addEventListener('click', this.windowListener);
                    document.addEventListener('contextmenu', this.contextMenuListener);
                }
            });
        }

        if (!this.state.visible && prevState.visible) {
            this.removeListeners();
        }
    }

    removeListeners = () => {
        document.removeEventListener('click', this.windowListener);
        document.removeEventListener('contextmenu', this.contextMenuListener);
    };

    onClickHandler = (e: React.MouseEvent<any, MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();
        this.triggerMenu(e.clientX);
    };

    contextMenuListener = () => this.setState({ visible: false });

    windowListener = (e: MouseEvent) => {
        const menu = this.menu.current;

        if (e.button === 2 || !this.state.visible || !menu) {
            return;
        }

        if (e.target === menu || menu.contains(e.target as Node)) {
            return;
        }

        if (e.target !== menu && !menu.contains(e.target as Node)) {
            this.setState({ visible: false });
        }
    };

    triggerMenu = (posX: number) =>
        this.setState((s) => ({
            posX: !s.visible ? posX : s.posX,
            visible: !s.visible,
        }));

    render() {
        return (
            <div>
                {this.props.renderToggle(this.onClickHandler)}
                <Fade timeout={150} in={this.state.visible} unmountOnExit>
                    <div
                        ref={this.menu}
                        onClick={(e) => {
                            e.stopPropagation();
                            this.setState({ visible: false });
                        }}
                        style={{ width: '12rem' }}
                        className={
                            'absolute z-50 rounded-lg border border-neutral-600 bg-neutral-700 p-2 text-neutral-200 shadow-lg'
                        }
                    >
                        {this.props.children}
                    </div>
                </Fade>
            </div>
        );
    }
}

export default DropdownMenu;
