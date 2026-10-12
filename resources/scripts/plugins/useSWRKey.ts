import useQueryContextKey, {
  useServerQueryKey,
  useUserQueryKey,
  useSWRKey,
  useServerSWRKey,
  useUserSWRKey,
} from "./useQueryKey";

const defaultExport = useQueryContextKey;

export {
  useServerQueryKey,
  useUserQueryKey,
  useSWRKey,
  useServerSWRKey,
  useUserSWRKey,
};
export default defaultExport;
