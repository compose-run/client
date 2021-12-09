import { useState, useEffect } from "react";
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

const registeredReducers: {
  [name: string]: { initialState: any; reducer: string };
} = {};

//////////////////////////////////////////
// UTILS
//////////////////////////////////////////

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
  // TODO - cache value in localstorage
}

// https://blog.trannhat.xyz/generate-a-hash-from-string-in-javascript/
const hashCode = function (s: string) {
  return s.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
};

//////////////////////////////////////////
// SETUP
//////////////////////////////////////////

// On page load, check if the URL contains the `magicLinkToken` param
const magicLinkToken = new URLSearchParams(window.location.search).get(
  "composeToken"
);
if (magicLinkToken) {
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
      loggedInUserSubscriptions.forEach((callback) => callback(loggedInUser));
    } else if (data.error) {
      getCallbacks(data.requestId)[3](data.error);
    } else {
      // token already saved in localStorage
      getCallbacks(data.requestId)[0](loggedInUser);
      loggedInUserSubscriptions.forEach((callback) => callback(loggedInUser));
    }
  } else if (data.type === "ParseErrorResponse") {
    console.error("Sent invalid JSON to server");
    console.error(data.cause);
  } else if (data.type === "ResolveDispatchResponse") {
    getCallbacks(data.requestId)[0](data.resolveValue);
    updateValue(data.name, data.returnValue);
  } else if (data.type === "RuntimeDebugResponse") {
    data.consoles.forEach((log) => console.log(`${data.name}: ${log}`));
    if (data.error) {
      console.error(`${data.name}\n\n${data.error.stack}`);
    }
  } else if (data.type === "RegisterReducerResponse") {
    // if you're the application programmer, you want to know when `data.error` is present
    // because that likely means you're not logged in when you want to be
    // however, this erroring is the default state for users of states (because they can't write the reducer)
    // so we don't want to spam the console with this error for all clients
    // so currently we're just going to ignore this error...
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
  const [state, setState] = useState(initialState);
  useSubscription(name, setState);
  return [state, (s: State) => setCloudState(name, s)];
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
  initialState: State;
  reducer: (
    state: State,
    action: Action,
    context: { resolve: (response: Response) => void; userId: number }
  ) => State;
}): [State | null, (action: Action) => Promise<Response>] {
  const [state, setState] = useState(null);
  useSubscription(name, setState);

  useEffect(() => {
    // try to register the reducer now, and on all authentication changes
    registerReducer({ name, reducer, initialState });
    loggedInUserSubscriptions.add(() =>
      registerReducer({ name, reducer, initialState })
    );
  }, [name, reducer.toString(), JSON.stringify(initialState)]);

  return [state, (a: Action) => dispatchCloudReducerEvent(name, a)];
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
  if (
    !registeredReducers[name] ||
    JSON.stringify(registeredReducers[name]) !==
      JSON.stringify({ initialState, reducer: reducer.toString() })
  ) {
    registeredReducers[name] = { initialState, reducer: reducer.toString() };
    send({
      type: "RegisterReducerRequest",
      name,
      reducerCode: reducer.toString(),
      initialState,
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

export function logout() {
  localStorage.removeItem(COMPOSE_TOKEN_KEY);
  localStorage.removeItem(COMPOSE_USER_CACHE_KEY);
  socket.send(JSON.stringify({ type: "LogoutRequest" }));
}

export { Request, Request_, Response, User } from "./shared-types";
