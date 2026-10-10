import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import { useAppStore } from '@/state';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import AddSubuserButton from '@/components/server/users/AddSubuserButton';
import UserRow from '@/components/server/users/UserRow';
import FlashMessageRender from '@/components/FlashMessageRender';
import getServerSubusers from '@/api/server/users/getServerSubusers';
import { httpErrorToHuman } from '@/api/http';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';

import BeforeContent from '@blueprint/components/Server/Users/BeforeContent';
import AfterContent from '@blueprint/components/Server/Users/AfterContent';

export default () => {
  const [loading, setLoading] = useState(true);

  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const subusers = ServerContext.useStoreState((state) => state.subusers.data);
  const setSubusers = ServerContext.useStoreActions(
    (actions) => actions.subusers.setSubusers,
  );

  const permissions = useAppStore((state) => state.permissions.data);
  const getPermissions = useAppStore(
    (state) => state.permissions.getPermissions,
  );
  const { addError, clearFlashes } = useFlash();

  useEffect(() => {
    clearFlashes('users');
    getServerSubusers(uuid)
      .then((subusers) => {
        setSubusers(subusers);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        addError({ key: 'users', message: httpErrorToHuman(error) });
      });
  }, []);

  useEffect(() => {
    getPermissions().catch((error) => {
      addError({ key: 'users', message: httpErrorToHuman(error) });
      console.error(error);
    });
  }, []);

  if (!subusers.length && (loading || !Object.keys(permissions).length)) {
    return <Spinner size={'large'} centered />;
  }

  return (
    <ServerContentBlock title={'Users'}>
      <FlashMessageRender byKey={'users'} className={'mb-4'} />
      <BeforeContent />
      {!subusers.length ? (
        <p className={'text-center text-sm text-neutral-300'}>
          It looks like you don&apos;t have any subusers.
        </p>
      ) : (
        subusers.map((subuser) => (
          <UserRow key={subuser.uuid} subuser={subuser} />
        ))
      )}
      <Can action={'user.create'}>
        <div className={'mt-6 flex justify-end'}>
          <AddSubuserButton />
        </div>
      </Can>
      <AfterContent />
    </ServerContentBlock>
  );
};
