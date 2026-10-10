import { UNSAFE_createBrowserHistory as createBrowserHistory } from "react-router";

export const history = createBrowserHistory({ v5Compat: true });
