import { User } from "./shared-types";
export declare function setComposeServerUrl(url: string): void;
export declare function setCloudState<A>(name: string, value: unknown): void;
export declare function useCloudState(name: string, initialState: unknown): unknown[];
export declare function dispatchCloudReducerEvent<A>(name: string, event: A): void;
export declare function useCloudReducer<State, Action, Response>({ name, initialState, reducer, }: {
    name: string;
    initialState: State;
    reducer: (state: State, action: Action, reducer: (response: Response) => void) => State;
}): unknown[];
export declare function magicLinkLogin({ email, appName, redirectURL, }: {
    email: string;
    appName: string;
    redirectURL?: string;
}): Promise<User>;
export declare function useUser(): User | null;
export declare function logout(): void;
export { Request, Request_, Response, User } from "./shared-types";
