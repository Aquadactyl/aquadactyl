import http, { FractalResponseData, FractalResponseList } from '@/api/http';
import { rawDataToServerAllocation, rawDataToServerEggVariable } from '@/api/transformers';
import { ServerEggVariable, ServerStatus } from '@/api/server/types';
import { Identifier } from '@/api/definitions';

export interface Allocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    isDefault: boolean;
}

export interface Server {
    id: Identifier<'serv'>;
    identifier: Identifier<'serv'>; // Set from "server_identifier" and should be used moving forward to reference a server.
    internalId: number | string;
    uuid: string;
    name: string;
    node: string;
    nodeCountry?: string | null;
    nodeCountryName?: string | null;
    userPermissions?: string[];
    gameQueryType?: string | null;
    isNodeUnderMaintenance: boolean;
    status: ServerStatus;
    sftpDetails: {
        ip: string;
        port: number;
    };
    invocation: string;
    dockerImage: string;
    description: string;
    limits: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
        threads: string;
    };
    eggFeatures: string[];
    featureLimits: {
        databases: number;
        allocations: number;
        backups: number;
    };
    isTransferring: boolean;
    skipScripts: boolean;
    variables: ServerEggVariable[];
    allocations: Allocation[];
    BlueprintFramework: { eggId: number };
}

export const rawDataToServerObject = ({ attributes: data }: FractalResponseData): Server => ({
    id: data.identifier,
    identifier: data.server_identifier,
    internalId: data.internal_id,
    uuid: data.uuid,
    name: data.name,
    node: data.node,
    nodeCountry: data.node_country ?? null,
    nodeCountryName: data.node_country_name ?? null,
    userPermissions: data.user_permissions || [],
    gameQueryType: data.game_query_type ?? null,
    isNodeUnderMaintenance: data.is_node_under_maintenance,
    status: data.status,
    invocation: data.invocation,
    dockerImage: data.docker_image,
    sftpDetails: {
        ip: data.sftp_details.ip,
        port: data.sftp_details.port,
    },
    description: data.description ? (data.description.length > 0 ? data.description : null) : null,
    limits: { ...data.limits },
    eggFeatures: data.egg_features || [],
    featureLimits: { ...data.feature_limits },
    isTransferring: data.is_transferring,
    skipScripts: data.skip_scripts,
    BlueprintFramework: { eggId: data.BlueprintFramework.egg_id },
    variables: ((data.relationships?.variables as FractalResponseList | undefined)?.data || []).map(
        rawDataToServerEggVariable,
    ),
    allocations: ((data.relationships?.allocations as FractalResponseList | undefined)?.data || []).map(
        rawDataToServerAllocation,
    ),
});

export default (uuid: string): Promise<[Server, string[]]> => {
    return new Promise((resolve, reject) => {
        http.get(`/api/client/servers/${uuid}`)
            .then(({ data }) =>
                resolve([
                    rawDataToServerObject(data),
                    data.meta?.is_server_owner ? ['*'] : data.meta?.user_permissions || [],
                ]),
            )
            .catch(reject);
    });
};
