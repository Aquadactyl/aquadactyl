import React, { memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import isEqual from 'react-fast-compare';

interface Props {
    icon?: IconProp;
    title: string | React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

const TitledGreyBox = ({ icon, title, children, className }: Props) => (
    <div className={classNames('rounded-lg border border-neutral-600 shadow-sm bg-neutral-700', className)}>
        <div className={'bg-neutral-700 rounded-t-lg p-3 border-b border-neutral-600'}>
            {typeof title === 'string' ? (
                <p className={'text-sm uppercase'}>
                    {icon && <FontAwesomeIcon icon={icon} className={'mr-2 text-neutral-300'} />}
                    {title}
                </p>
            ) : (
                title
            )}
        </div>
        <div className={'p-3'}>{children}</div>
    </div>
);

export default memo(TitledGreyBox, isEqual);
