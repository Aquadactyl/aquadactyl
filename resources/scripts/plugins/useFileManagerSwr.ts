import useFileManagerQuery, {
  getDirectoryQueryKey,
  getDirectorySwrKey,
} from "./useFileManagerQuery";

const useFileManagerSwr = useFileManagerQuery;

export { getDirectoryQueryKey, getDirectorySwrKey };
export default useFileManagerSwr;
