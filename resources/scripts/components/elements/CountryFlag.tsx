import React from 'react';
export default ({ code, name }: { code?: string | null; name?: string | null }) => {
    if (!code || !/^[A-Z]{2}$/.test(code)) return null;
    return (
        <img
            className={'country-flag'}
            src={'/flags/' + code.toLowerCase() + '.svg'}
            alt={name || code}
            title={name || code}
            width={20}
            height={15}
        />
    );
};
