import { useState, useEffect, useCallback } from "react";
import { Request, Request_, Response, User } from "./shared-types";

//////////////////////////////////////////
// GLOBALS
//////////////////////////////////////////

const COMPOSE_USER_CACHE_KEY = "compose-cache:user";
const COMPOSE_TOKEN_KEY = "compose-token";

const subscriptions: {
  [key: string]: Set<(data: React.SetStateAction<any>) => void>;
} = {};

let loggedInUser: User | null = null;
if (localStorage.getItem(COMPOSE_USER_CACHE_KEY)) {
  loggedInUser = safeParseJSON(localStorage.getItem(COMPOSE_USER_CACHE_KEY));
}
const loggedInUserSubscriptions = new Set<(user: User | null) => void>();

const ensureSet = (name: string) =>
  (subscriptions[name] = subscriptions[name] || new Set());

const callbacks: {
  [key: string]: [
    // promise 1
    (...args: any[]) => void,
    (error: string) => void,
    // promise 2 (ie sendMagicLink2 -> LoginResponse)
    (...args: any[]) => void,
    (error: string) => void
  ];
} = {};
const getCallbacks = (name: string) => {
  return (
    callbacks[name] || [() => void 0, () => void 0, () => void 0, () => void 0]
  );
};

let socketOpen = false;
let queuedMessages: Request_[] = [];

let socket: WebSocket;
let composeServerUrl =
  process.env.REACT_APP_COMPOSE_SERVER_URL || "wss://api.compose.run";

let registeredReducers: {
  [name: string]: { initialState: any; reducerCode: string };
} = {};

const liveSubscriptions = new Set<string>();

//////////////////////////////////////////
// UTILS
//////////////////////////////////////////

function isPromise<A>(p: Promise<A> | A): boolean {
  return p && Object.prototype.toString.call(p) === "[object Promise]";
}

function safeParseJSON(str: string | null) {
  if (!str) {
    return null;
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

const uuid = () => (Math.random() + 1).toString(36).substring(7);

function send<Response>(data: Request, requestId: string = uuid()) {
  return new Promise<Response>((resolve, reject) => {
    callbacks[requestId] = [resolve, reject, () => void 0, () => void 0];
    if (socketOpen) {
      actuallySend({ ...data, requestId });
    } else {
      // TODO - after a while, close and try to reconnect
      // TODO - eventually, throw an error (promise throw)
      //        on all the places that pushed to this queue
      queuedMessages.push({ ...data, requestId });
    }
  });
}

function actuallySend(data: Request_) {
  try {
    socket.send(JSON.stringify(data));
    queuedMessages = queuedMessages.filter(
      (d) => d.requestId !== data.requestId
    );
  } catch (e) {
    console.error(e);
  }
}

function updateValue(name: string, value: unknown) {
  ensureSet(name).forEach((callback) => callback(value));
  setCachedState(name, value);
}

const getCachedState = (name: string) => {
  try {
    return JSON.parse(localStorage.getItem("compose-cache:" + name) || "null");
  } catch (e) {
    return null;
  }
};

const setCachedState = (name: string, value: any) =>
  localStorage.setItem(
    "compose-cache:" + name,
    JSON.stringify(value) || "null"
  );

const callAuthStateChangedCallbacks = (user: User | null) => {
  registeredReducers = {};
  loggedInUserSubscriptions.forEach((callback) => callback(user));
};

//////////////////////////////////////////
// SETUP
//////////////////////////////////////////

// On page load, check if the URL contains the `magicLinkToken` param
const magicLinkToken = new URLSearchParams(window.location.search).get(
  "composeToken"
);
if (magicLinkToken) {
  window.history.replaceState(null, document.title, window.location.pathname);
  send({
    type: "LoginRequest",
    token: magicLinkToken,
  });
}

//////////////////////////////////////////
// HANDLE SERVER RESPONSES
//////////////////////////////////////////

const handleServerResponse = function (event: MessageEvent) {
  const data: Response | null = safeParseJSON(event.data);
  if (!data) {
    console.error("Invalid JSON received from server");
    console.error(event);
    return;
  }

  if (
    data.type === "SubscribeResponse" ||
    data.type === "UpdatedValueResponse"
  ) {
    if (data.type === "UpdatedValueResponse" && data.error) {
      getCallbacks(data.requestId)[1](
        `${data.name}: Cannot set this state because there is a reducer with the same name`
      );
    } else {
      if (data.type === "SubscribeResponse") {
        liveSubscriptions.add(data.name);
      }
      getCallbacks(data.requestId)[0](data.value);
      updateValue(data.name, data.value);
    }
  } else if (data.type === "SendMagicLinkResponse") {
    if (data.error) {
      getCallbacks(data.requestId)[1](data.error);
    } else {
      getCallbacks(data.requestId)[0](null);
    }
  } else if (data.type === "LoginResponse") {
    if (data.token) {
      localStorage.setItem(COMPOSE_TOKEN_KEY, data.token);
      localStorage.setItem(COMPOSE_USER_CACHE_KEY, JSON.stringify(data.user));
      loggedInUser = data.user || null;
      getCallbacks(data.requestId)[2](data.user);
      callAuthStateChangedCallbacks(loggedInUser);
    } else if (data.error) {
      getCallbacks(data.requestId)[3](data.error);
      clearUserCache();
      callAuthStateChangedCallbacks(null);
    } else {
      // token already saved in localStorage
      getCallbacks(data.requestId)[0](loggedInUser);
      callAuthStateChangedCallbacks(loggedInUser);
    }
  } else if (data.type === "LogoutResponse") {
    clearUserCache();
    callAuthStateChangedCallbacks(null);
  } else if (data.type === "ParseErrorResponse") {
    console.error("Sent invalid JSON to server");
    console.error(data.cause);
  } else if (data.type === "ResolveDispatchResponse") {
    if (data.returnValue) {
      getCallbacks(data.requestId)[0](data.resolveValue);
      updateValue(data.name, data.returnValue);
    }
  } else if (data.type === "RuntimeDebugResponse") {
    data.consoles.forEach((log) => console.log(`${data.name}: ${log}`));
    if (data.error) {
      console.error(
        `${data.name}: %c${data.error.stack?.split("\n")[0]}`,
        "font-weight: bold"
      );
    }
  } else if (data.type === "RegisterReducerResponse") {
    // if you're the application programmer, you want to know when `data.error` is present
    // because that likely means you're not logged in when you want to be
    // however, this erroring is the default state for users of states (because they can't write the reducer)
    // so we don't want to spam the console with this error for all clients
    // so currently we're just going to ignore this error...
  } else if (data.type === "UnsubscribeResponse") {
    liveSubscriptions.delete(data.name);
  } else {
    console.warn(`Unknown response type from Compose server: ${data.type}`);
  }
};

//////////////////////////////////////////
// Setup Websocket
//////////////////////////////////////////

const handleSocketOpen = async () => {
  socketOpen = true;
  if (localStorage.getItem(COMPOSE_TOKEN_KEY)) {
    send({
      type: "LoginRequest",
      token: localStorage.getItem(COMPOSE_TOKEN_KEY) as string,
    });
  }
  // maybe sending while awaiting to ensure ordering is overkill
  // we can definitely include local ordering inside the message itself
  for (const message of queuedMessages) {
    await actuallySend(message);
  }
};

const handleSocketClose = function () {
  socketOpen = false;
  setTimeout(setupWebsocket, 200);
};

function setupWebsocket() {
  if (socket && socketOpen) socket.close();

  try {
    socket = new WebSocket(composeServerUrl);
    socket.addEventListener("message", handleServerResponse);
    socket.addEventListener("open", handleSocketOpen);
    socket.addEventListener("close", handleSocketClose);
  } catch (e) {
    console.error(e);
  }
}
setupWebsocket();

//////////////////////////////////////////
// Common: Cloud State & Reducer
//////////////////////////////////////////

function useSubscription<State>(name: string, setState: (data: State) => void) {
  useEffect(() => {
    if (!ensureSet(name).size) {
      send({
        type: "SubscribeRequest",
        name,
      });
    }
    subscriptions[name].add(setState);
    return () => {
      subscriptions[name].delete(setState);
      if (!ensureSet(name).size) {
        send({
          type: "UnsubscribeRequest",
          name,
        });
      }
    };
  }, [setState]);
}

// utilizes the subscription & cache infrastructure to get a single state value as a Promise
export function getCloudState<State>(name: string): Promise<State | null> {
  return new Promise((resolve) => {
    // use the cache if the subscription is live
    if (liveSubscriptions.has(name)) {
      resolve(getCachedState(name));
    } else {
      // otherwise, create the subscription if it doesn't exist
      if (!ensureSet(name).size) {
        send({
          type: "SubscribeRequest",
          name,
        });
        // and resolve on the value when it arrives
        // and unsubsubscribe if we're the only subscriber
        const onValue = (value: State) => {
          resolve(value);
          subscriptions[name].delete(onValue);
          if (!ensureSet(name).size) {
            send({
              type: "UnsubscribeRequest",
              name,
            });
          }
        };
        subscriptions[name].add(onValue);
      }
    }
  });
}

//////////////////////////////////////////
// Cloud State
//////////////////////////////////////////

export function setCloudState<A>(name: string, value: unknown) {
  send({
    type: "StateUpdateRequest",
    name,
    value,
  });
}

export function useCloudState<State>({
  name,
  initialState,
}: {
  name: string;
  initialState: State;
}): [State, (data: State) => void] {
  const [state, setState] = useState(getCachedState(name) || initialState);
  useSubscription(name, setState);
  const setter = useCallback((s: State) => setCloudState(name, s), [name]);
  return [state, setter];
}

//////////////////////////////////////////
// CLOUD REDUCER
//////////////////////////////////////////

export function dispatchCloudReducerEvent<Event, Response>(
  name: string,
  event: Event
): Promise<Response> {
  return send({
    type: "ReducerEventRequest",
    name,
    value: event,
  });
}

export function useCloudReducer<State, Action, Response>({
  name,
  initialState,
  reducer,
}: {
  name: string;
  initialState: State | Promise<State>; //(() => Promise<State>);
  reducer: (
    state: State,
    action: Action,
    context: {
      resolve: (response: Response) => void;
      userId: number;
      timestamp: number;
    }
  ) => State;
}): [State | null, (action?: Action) => Promise<Response>] {
  const [state, setState] = useState(getCachedState(name));
  useSubscription(name, setState);

  const userId = useUser();

  useEffect(() => {
    // if the initialState is a Promise, only register the reducer once the promise resolves
    if (isPromise(initialState)) {
      (initialState as Promise<State>).then((s) => {
        registerReducer({ name, reducer, initialState: s });
      });
    } else {
      registerReducer({ name, reducer, initialState });
    }
  }, [
    name,
    reducer.toString(),
    isPromise(initialState) ? initialState : JSON.stringify(initialState),
    userId,
  ]);

  // TODO - ensure that we buffer all of these until the initial state promise is set
  // otherwise we will miss any dispatches that are triggered before the new reducer is registered
  const dispatcher = useCallback(
    (a?: Action) => dispatchCloudReducerEvent(name, a),
    [name]
  ) as (a?: Action) => Promise<Response>;

  return [state, dispatcher];
}

const registerReducer = <State>({
  name,
  reducer,
  initialState,
}: {
  name: string;
  reducer: Function;
  initialState: State;
}) => {
  const cacheValue = {
    initialState,
    reducerCode: reducer.toString(),
  };
  if (
    !registeredReducers[name] ||
    JSON.stringify(registeredReducers[name]) !== JSON.stringify(cacheValue)
  ) {
    registeredReducers[name] = cacheValue;
    send({
      type: "RegisterReducerRequest",
      name,
      ...cacheValue,
    });
  }
};

//////////////////////////////////////////
// USER & AUTH
//////////////////////////////////////////

export function magicLinkLogin({
  email,
  appName,
  redirectURL,
}: {
  email: string;
  appName: string;
  redirectURL?: string;
}): Promise<null> {
  redirectURL = redirectURL || window.location.href;
  return send({
    type: "SendMagicLinkRequest",
    email,
    appName,
    redirectURL,
  }) as Promise<null>;
}

export function magicLinkLogin2({
  email,
  appName,
  redirectURL,
}: {
  email: string;
  appName: string;
  redirectURL?: string;
}): [Promise<null>, Promise<User>] {
  redirectURL = redirectURL || window.location.href;

  const requestId = uuid();
  const sendMagicLinkPromise = send(
    {
      type: "SendMagicLinkRequest",
      email,
      appName,
      redirectURL,
    },
    requestId
  );
  const loginPromise = new Promise<User>((resolve, reject) => {
    getCallbacks(requestId).push(resolve, reject);
  });
  return [sendMagicLinkPromise as Promise<null>, loginPromise];
}

export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(loggedInUser);
  useEffect(() => {
    loggedInUserSubscriptions.add(setUser);
    return () => {
      loggedInUserSubscriptions.delete(setUser);
    };
  }, []);
  return user;
}

function clearUserCache() {
  loggedInUser = null;
  localStorage.removeItem(COMPOSE_TOKEN_KEY);
  localStorage.removeItem(COMPOSE_USER_CACHE_KEY);
}

export function logout() {
  clearUserCache();
  socket.send(JSON.stringify({ type: "LogoutRequest" }));
}

export { Request, Request_, Response, User } from "./shared-types";
