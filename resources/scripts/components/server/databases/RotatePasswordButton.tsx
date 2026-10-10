import React, { useState } from 'react';
import rotateDatabasePassword from '@/api/server/databases/rotateDatabasePassword';
import useFlash from '@/plugins/useFlash';
import { useServerStore } from '@/state/server';
import { ServerDatabase } from '@/api/server/databases/getServerDatabases';
import { httpErrorToHuman } from '@/api/http';
import Button from '@/components/elements/Button';

export default ({
  databaseId,
  onUpdate,
}: {
  databaseId: string;
  onUpdate: (database: ServerDatabase) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const { addFlash, clearFlashes } = useFlash();
  const server = useServerStore((state) => state.server.data!);

  if (!databaseId) {
    return null;
  }

  const rotate = () => {
    setLoading(true);
    clearFlashes();

    rotateDatabasePassword(server.uuid, databaseId)
      .then((database) => onUpdate(database))
      .catch((error) => {
        console.error(error);
        addFlash({
          type: 'error',
          title: 'Error',
          message: httpErrorToHuman(error),
          key: 'database-connection-modal',
        });
      })
      .then(() => setLoading(false));
  };

  return (
    <Button
      isSecondary
      color={'primary'}
      className={'mr-2'}
      onClick={rotate}
      isLoading={loading}
    >
      Rotate Password
    </Button>
  );
};
