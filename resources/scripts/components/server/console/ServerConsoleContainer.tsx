import React, { memo } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import StatGraphs from '@/components/server/console/StatGraphs';
import PowerButtons from '@/components/server/console/PowerButtons';
import ServerDetailsBlock from '@/components/server/console/ServerDetailsBlock';
import { Alert } from '@/components/elements/alert';

import BeforeContent from '@blueprint/components/Server/Terminal/BeforeContent';
import AfterContent from '@blueprint/components/Server/Terminal/AfterContent';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const ServerConsoleContainer = () => {
  const name = ServerContext.useStoreState((state) => state.server.data!.name);
  const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
  const description = ServerContext.useStoreState(
    (state) => state.server.data!.description,
  );
  const isInstalling = ServerContext.useStoreState(
    (state) => state.server.isInstalling,
  );
  const isTransferring = ServerContext.useStoreState(
    (state) => state.server.data!.isTransferring,
  );
  const eggFeatures = ServerContext.useStoreState(
    (state) => state.server.data!.eggFeatures,
    isEqual,
  );
  const isNodeUnderMaintenance = ServerContext.useStoreState(
    (state) => state.server.data!.isNodeUnderMaintenance,
  );

  return (
    <ServerContentBlock title={'Console'}>
      {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
        <Alert type={'warning'} className={'mb-4'}>
          {isNodeUnderMaintenance
            ? 'The node of this server is currently under maintenance and all actions are unavailable.'
            : isInstalling
              ? 'This server is currently running its installation process and most actions are unavailable.'
              : 'This server is currently being transferred to another node and all actions are unavailable.'}
        </Alert>
      )}
      <BeforeContent />
      <div className={'mb-4 grid grid-cols-4 gap-4'}>
        <div className={'col-span-4 pr-4 sm:col-span-2 lg:col-span-3'}>
          <h1
            className={
              'font-header line-clamp-1 text-2xl leading-relaxed font-medium text-gray-50'
            }
          >
            {name}
          </h1>
          <p
            className={'mb-1 font-mono text-xs break-all text-gray-400'}
            title={'Server UUID'}
          >
            {uuid}
          </p>
          <p className={'line-clamp-2 text-sm text-gray-400'}>{description}</p>
        </div>
        <div className={'col-span-4 self-end sm:col-span-2 lg:col-span-1'}>
          <Can
            action={['control.start', 'control.stop', 'control.restart']}
            matchAny
          >
            <PowerButtons className={'flex space-x-2 sm:justify-end'} />
          </Can>
        </div>
      </div>
      <div className={'mb-4 grid grid-cols-4 gap-2 sm:gap-4'}>
        <div className={'col-span-4 flex lg:col-span-3'}>
          <Spinner.Suspense>
            <Console />
          </Spinner.Suspense>
        </div>
        <ServerDetailsBlock
          className={'order-last col-span-4 lg:order-0 lg:col-span-1'}
        />
      </div>
      <div className={'grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3'}>
        <Spinner.Suspense>
          <StatGraphs />
        </Spinner.Suspense>
      </div>
      <AfterContent />
      <Features enabled={eggFeatures} />
    </ServerContentBlock>
  );
};

export default memo(ServerConsoleContainer, isEqual);
