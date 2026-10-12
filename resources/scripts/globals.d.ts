/// <reference types="vite/client" />
import type React from "react";
import "react";
import type { FractalResponseData, FractalResponseList } from "@/api/http";
import type { SubuserPermission } from "@/state/server/subusers";

declare module "react" {
  interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode | undefined }, context?: any): ReactNode;
  }

  interface VoidFunctionComponent<P = {}> {
    (props: P, context?: any): ReactNode;
  }
}

declare module "*.jpg";
declare module "*.png";
declare module "*.svg";
declare module "*.css";

export type Callback<T> =
  | ((value: T) => void)
  | React.Dispatch<React.SetStateAction<T>>;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export type IconPosition = "title" | "container" | undefined;

export interface DialogIconProps {
  type: "danger" | "info" | "success" | "warning";
  position?: IconPosition;
  className?: string;
}

export interface RenderDialogProps extends DialogProps {
  hideCloseIcon?: boolean;
  preventExternalClose?: boolean;
  title?: string;
  description?: string | undefined;
  children?: React.ReactNode;
}

export type WrapperProps = Omit<
  RenderDialogProps,
  "children" | "open" | "onClose"
>;

export interface DialogWrapperContextType {
  props: Readonly<WrapperProps>;
  setProps: React.Dispatch<React.SetStateAction<WrapperProps>>;
  close: () => void;
}

export interface DialogContextType {
  setIcon: Callback<React.ReactNode>;
  setFooter: Callback<React.ReactNode>;
  setIconPosition: Callback<IconPosition>;
}

export interface WithClassname {
  className?: string;
}

export type ServerStatus =
  | "installing"
  | "install_failed"
  | "reinstall_failed"
  | "suspended"
  | "restoring_backup"
  | null;

export interface ServerBackup {
  uuid: string;
  isSuccessful: boolean;
  isLocked: boolean;
  name: string;
  ignoredFiles: string;
  checksum: string;
  bytes: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ServerEggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  serverValue: string | null;
  isEditable: boolean;
  rules: string[];
}

export type MarkRequired<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type UUID = string;
export type Identifier<P extends string = string> = `${P}_${string}`;
export interface Model<_T = any> {}

export interface ModelWithRelationships extends Model {
  relationships: Record<
    string,
    FractalResponseData | FractalResponseList | undefined
  >;
}

/**
 * Allows a model to have optional relationships that are marked as being
 * present in a given pathway. This allows different API calls to specify the
 * "completeness" of a response object without having to make every API return
 * the same information, or every piece of logic do explicit null checking.
 *
 * Example:
 *  >> const user: WithLoaded<User, 'servers'> = {};
 *  >> // "user.servers" is no longer potentially undefined.
 */
export type WithLoaded<
  M extends ModelWithRelationships,
  R extends keyof M["relationships"],
> = M & {
  relationships: MarkRequired<M["relationships"], R>;
};

/**
 * Helper type that allows you to infer the type of an object by giving
 * it the specific API request function with a return type. For example:
 *
 * type Egg = InferModel<typeof getEgg>;
 */
export type InferModel<T extends (...args: any) => any> =
  ReturnType<T> extends Promise<infer U> ? U : T;

export interface User extends Model {
  uuid: string;
  username: string;
  email: string;
  image: string;
  avatarUrl?: string | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
  permissions: SubuserPermission[];
  can(permission: SubuserPermission): boolean;
}

export interface SSHKey extends Model {
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
}

export interface ActivityLog extends Model<"actor"> {
  id: string;
  batch: UUID | null;
  event: string;
  ip: string | null;
  isApi: boolean;
  description: string | null;
  properties: Record<string, string | unknown>;
  hasAdditionalMetadata: boolean;
  timestamp: Date;
  relationships: {
    actor: User | null;
  };
}

declare global {
  type Callback<T> =
    | ((value: T) => void)
    | React.Dispatch<React.SetStateAction<T>>;

  interface DialogProps {
    open: boolean;
    onClose: () => void;
  }

  type IconPosition = "title" | "container" | undefined;

  interface DialogIconProps {
    type: "danger" | "info" | "success" | "warning";
    position?: IconPosition;
    className?: string;
  }

  interface RenderDialogProps extends DialogProps {
    hideCloseIcon?: boolean;
    preventExternalClose?: boolean;
    title?: string;
    description?: string | undefined;
    children?: React.ReactNode;
  }

  type WrapperProps = Omit<RenderDialogProps, "children" | "open" | "onClose">;

  interface DialogWrapperContextType {
    props: Readonly<WrapperProps>;
    setProps: React.Dispatch<React.SetStateAction<WrapperProps>>;
    close: () => void;
  }

  interface DialogContextType {
    setIcon: Callback<React.ReactNode>;
    setFooter: Callback<React.ReactNode>;
    setIconPosition: Callback<IconPosition>;
  }

  interface WithClassname {
    className?: string;
  }

  type ServerStatus =
    | "installing"
    | "install_failed"
    | "reinstall_failed"
    | "suspended"
    | "restoring_backup"
    | null;

  interface ServerBackup {
    uuid: string;
    isSuccessful: boolean;
    isLocked: boolean;
    name: string;
    ignoredFiles: string;
    checksum: string;
    bytes: number;
    createdAt: Date;
    completedAt: Date | null;
  }

  interface ServerEggVariable {
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    serverValue: string | null;
    isEditable: boolean;
    rules: string[];
  }

  type MarkRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

  type UUID = string;
  type Identifier<P extends string = string> = `${P}_${string}`;
  interface Model<_T = any> {}

  interface ModelWithRelationships extends Model {
    relationships: Record<
      string,
      FractalResponseData | FractalResponseList | undefined
    >;
  }

  type WithLoaded<
    M extends ModelWithRelationships,
    R extends keyof M["relationships"],
  > = M & {
    relationships: MarkRequired<M["relationships"], R>;
  };

  type InferModel<T extends (...args: any) => any> =
    ReturnType<T> extends Promise<infer U> ? U : T;

  interface User extends Model {
    uuid: string;
    username: string;
    email: string;
    image: string;
    avatarUrl?: string | null;
    twoFactorEnabled: boolean;
    createdAt: Date;
    permissions: SubuserPermission[];
    can(permission: SubuserPermission): boolean;
  }

  interface SSHKey extends Model {
    name: string;
    publicKey: string;
    fingerprint: string;
    createdAt: Date;
  }

  interface ActivityLog extends Model<"actor"> {
    id: string;
    batch: UUID | null;
    event: string;
    ip: string | null;
    isApi: boolean;
    description: string | null;
    properties: Record<string, string | unknown>;
    hasAdditionalMetadata: boolean;
    timestamp: Date;
    relationships: {
      actor: User | null;
    };
  }
}
