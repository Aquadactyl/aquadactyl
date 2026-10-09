import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/elements/button/index';
import { useAppStore } from '@/state';
import useFlash from '@/plugins/useFlash';
import { uploadAccountAvatar, removeAccountAvatar } from '@/api/account/updateAccountAvatar';

const ProfilePictureForm = () => {
    const avatarUrl = useAppStore((state) => state.user.data?.avatarUrl);
    const updateUserData = useAppStore((state) => state.user.updateUserData);
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>();
    const [busy, setBusy] = useState(false);
    const { clearFlashes, addFlash, clearAndAddHttpError } = useFlash();

    useEffect(() => {
        if (!file) {
            setPreview(undefined);
            return;
        }

        const url = URL.createObjectURL(file);
        const safeUrl = url.startsWith('blob:') ? encodeURI(url) : undefined;
        setPreview(safeUrl);
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [file]);

    const clearSelection = () => {
        setFile(null);
        if (input.current) input.current.value = '';
    };

    const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
        clearFlashes('account:avatar');
        const selected = event.target.files?.[0];
        if (!selected) return;

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || selected.size > 2 * 1024 * 1024) {
            clearSelection();
            addFlash({ key: 'account:avatar', type: 'error', message: 'Choose a PNG, JPEG or WebP image up to 2 MB.' });
            return;
        }

        setFile(selected);
    };

    const save = async () => {
        if (!file || busy) return;
        clearFlashes('account:avatar');
        setBusy(true);

        try {
            const avatarUrl = await uploadAccountAvatar(file);
            updateUserData({ avatarUrl });
            clearSelection();
            addFlash({ key: 'account:avatar', type: 'success', message: 'Your profile picture has been updated.' });
        } catch (error) {
            clearAndAddHttpError({ key: 'account:avatar', error });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (busy) return;
        clearFlashes('account:avatar');
        setBusy(true);

        try {
            await removeAccountAvatar();
            updateUserData({ avatarUrl: null });
            clearSelection();
            addFlash({ key: 'account:avatar', type: 'success', message: 'Your profile picture has been removed.' });
        } catch (error) {
            clearAndAddHttpError({ key: 'account:avatar', error });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={'flex flex-col items-start gap-6 sm:flex-row sm:items-center'}>
            <div className={'shrink-0'}>
                {preview && preview.startsWith('blob:') ? (
                    <img
                        src={encodeURI(preview)}
                        alt={'Profile picture preview'}
                        className={'h-24 w-24 rounded-full object-cover'}
                    />
                ) : (
                    <Avatar.User size={96} />
                )}
            </div>
            <div className={'w-full sm:flex-1'}>
                <label htmlFor={'profile_picture'} className={'mb-2 block text-sm font-medium'}>
                    Choose a profile picture
                </label>
                <input
                    ref={input}
                    id={'profile_picture'}
                    type={'file'}
                    accept={'image/png,image/jpeg,image/webp'}
                    disabled={busy}
                    onChange={selectFile}
                    aria-describedby={'profile_picture_help'}
                    className={'block w-full text-sm'}
                />
                <p id={'profile_picture_help'} className={'mt-2 text-xs text-neutral-400'}>
                    PNG, JPEG or WebP up to 2 MB and 4096 × 4096 pixels. Pictures are cropped to a square.
                </p>
                <div className={'mt-4 flex flex-wrap gap-3'}>
                    <Button type={'button'} disabled={!file || busy} onClick={save}>
                        {busy ? 'Saving…' : 'Upload Picture'}
                    </Button>
                    <Button.Text type={'button'} disabled={!avatarUrl || busy} onClick={remove}>
                        Remove Picture
                    </Button.Text>
                </div>
            </div>
        </div>
    );
};

export default ProfilePictureForm;
