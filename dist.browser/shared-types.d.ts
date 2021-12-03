export interface User {
    email: string;
    id: number;
}
interface SendMagicLinkRequest {
    type: "SendMagicLinkRequest";
    email: string;
    appName: string;
    redirectURL: string;
}
interface LoginRequest {
    type: "LoginRequest";
    token: string;
}
interface LogoutRequest {
    type: "LogoutRequest";
}
interface SubscribeRequest {
    type: "SubscribeRequest";
    name: string;
}
interface UnsubscribeRequest {
    type: "UnsubscribeRequest";
    name: string;
}
interface StateUpdateRequest {
    type: "StateUpdateRequest";
    name: string;
    value: unknown;
}
interface ReducerEventRequest {
    type: "ReducerEventRequest";
    name: string;
    value: unknown;
}
interface RegisterReducerRequest {
    type: "RegisterReducerRequest";
    name: string;
    initialState: unknown;
    reducerCode: string;
}
export declare type Request = SendMagicLinkRequest | LoginRequest | LogoutRequest | SubscribeRequest | UnsubscribeRequest | StateUpdateRequest | ReducerEventRequest | RegisterReducerRequest;
export declare type Request_ = Request & {
    requestId: string;
};
interface SendMagicLinkResponse {
    type: "SendMagicLinkResponse";
    requestId: string;
    error?: string;
}
interface LoginResponse {
    type: "LoginResponse";
    requestId: string;
    token?: string;
    error?: string;
    user?: User;
}
interface LogoutResponse {
    type: "LogoutResponse";
    requestId: string;
    error?: string;
}
interface UpdatedValueProperties {
    name: string;
    value: unknown;
    timestamp?: number;
}
interface SubscribeResponse extends UpdatedValueProperties {
    type: "SubscribeResponse";
    requestId: string;
}
interface UpdatedValueResponse extends UpdatedValueProperties {
    type: "UpdatedValueResponse";
    requestId: string;
    error?: string;
}
interface UnsubscribeResponse {
    type: "UnsubscribeResponse";
    requestId: string;
    name: string;
    error?: string;
}
interface ReducerEventResponse {
    type: "ReducerEvent";
    requestId: string;
    name: string;
    value: unknown;
}
interface ParseErrorResponse {
    type: "ParseErrorResponse";
    cause: string;
}
interface RegisterReducerResponse {
    type: "RegisterReducerResponse";
    requestId: string;
    name: string;
    error?: "Unauthorized" | string;
    warn?: "New initial state ignored" | string;
}
interface ResolveDispatchResponse {
    type: "ResolveDispatchResponse";
    name: string;
    requestId: string;
    resolveValue: unknown;
    returnValue: unknown;
}
interface SerializableError {
    message: string | undefined;
    stack: string | undefined;
}
interface RuntimeDebugResponse {
    type: "RuntimeDebugResponse";
    name: string;
    requestId: string;
    resolveValue: unknown;
    returnValue: unknown;
    consoles: string[];
    error: SerializableError | undefined;
}
export declare type Response = SendMagicLinkResponse | LoginResponse | LogoutResponse | SubscribeResponse | UnsubscribeResponse | ReducerEventResponse | UpdatedValueResponse | ParseErrorResponse | RegisterReducerResponse | ResolveDispatchResponse | RuntimeDebugResponse;
export {};
