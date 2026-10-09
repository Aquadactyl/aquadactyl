import React, { useEffect, useState } from 'react';
import BoringAvatar from 'boring-avatars';
import { useStoreState } from '@/state/hooks';

const palette = ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#587291'];

type Props = Omit<React.ComponentProps<typeof BoringAvatar>, 'colors'> & { src?: string | null; alt?: string };

const _Avatar = ({ src, alt = 'Profile picture', variant = 'beam', size = 40, square = false, ...props }: Props) => {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);

    return src && !failed ? (
        <img
            src={encodeURI(src)}
            alt={alt}
            width={size}
            height={size}
            onError={() => setFailed(true)}
            style={{
                width: size,
                height: size,
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                borderRadius: square ? 0 : '50%',
            }}
        />
    ) : (
        <BoringAvatar colors={palette} variant={variant} size={size} square={square} {...props} />
    );
};

const _UserAvatar = ({ variant = 'beam', size = 40, square = false, ...props }: Omit<Props, 'name'>) => {
    const user = useStoreState((state) => state.user.data);

    return (
        <_Avatar
            src={user?.avatarUrl}
            alt={`${user?.username || 'User'}'s profile picture`}
            name={user?.uuid || 'system'}
            variant={variant}
            size={size}
            square={square}
            {...props}
        />
    );
};

_Avatar.displayName = 'Avatar';
_UserAvatar.displayName = 'Avatar.User';

const Avatar = Object.assign(_Avatar, {
    User: _UserAvatar,
});

export default Avatar;
