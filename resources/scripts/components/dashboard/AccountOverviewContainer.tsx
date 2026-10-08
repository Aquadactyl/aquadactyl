import React from 'react';
import ContentBox from '@/components/elements/ContentBox';
import UpdatePasswordForm from '@/components/dashboard/forms/UpdatePasswordForm';
import UpdateEmailAddressForm from '@/components/dashboard/forms/UpdateEmailAddressForm';
import ProfilePictureForm from '@/components/dashboard/forms/ProfilePictureForm';
import PrivacySettingsForm from '@/components/dashboard/forms/PrivacySettingsForm';
import ConfigureTwoFactorForm from '@/components/dashboard/forms/ConfigureTwoFactorForm';
import PageContentBlock from '@/components/elements/PageContentBlock';
import MessageBox from '@/components/MessageBox';
import { useLocation } from 'react-router-dom';

import BeforeContent from '@blueprint/components/Account/Overview/BeforeContent';
import AfterContent from '@blueprint/components/Account/Overview/AfterContent';

export default () => {
    const { state } = useLocation<undefined | { twoFactorRedirect?: boolean }>();

    return (
        <PageContentBlock title={'Account settings'}>
            <div className={'page-heading'}>
                <div>
                    <p className={'page-eyebrow'}>Your account</p>
                    <h1 className={'page-title'}>Account settings</h1>
                    <p className={'page-description'}>Manage your sign-in details and keep your account secure.</p>
                </div>
            </div>
            {state?.twoFactorRedirect && (
                <MessageBox title={'Two-step verification required'} type={'error'}>
                    Enable two-step verification below to continue.
                </MessageBox>
            )}
            <BeforeContent />
            <ContentBox
                style={{ marginBottom: 24 }}
                title={'Profile picture'}
                description={'Personalize your account with a picture.'}
                showFlashes={'account:avatar'}
            >
                <ProfilePictureForm />
            </ContentBox>
            <ContentBox
                style={{ marginBottom: 24 }}
                title={'Privacy'}
                description={'Control what appears while sharing your screen.'}
                showFlashes={'account:privacy'}
            >
                <PrivacySettingsForm />
            </ContentBox>
            <div className={'account-grid'}>
                <ContentBox
                    title={'Password'}
                    description={'Choose a strong password that you don’t use elsewhere.'}
                    showFlashes={'account:password'}
                >
                    <UpdatePasswordForm />
                </ContentBox>
                <ContentBox
                    title={'Email address'}
                    description={'Keep your contact and recovery address up to date.'}
                    showFlashes={'account:email'}
                >
                    <UpdateEmailAddressForm />
                </ContentBox>
                <ContentBox
                    title={'Two-step verification'}
                    description={'Add an extra layer of protection to your account.'}
                >
                    <ConfigureTwoFactorForm />
                </ContentBox>
            </div>
            <AfterContent />
        </PageContentBlock>
    );
};
