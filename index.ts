import { useState, useEffect } from "react";
import { Request, Request_, Response, User } from "./shared-types";

//////////////////////////////////////////
// GLOBALS
//////////////////////////////////////////

const COMPOSE_USER_CACHE_KEY = "compose-cache:user";
const COMPOSE_TOKEN_KEY = "compose-token";

const subscriptions: {
  [key: string]: Set<(data: React.SetStateAction<unknown>) => void>;
} = {};

let loggedInUser: User | null = null;
if (localStorage.getItem(COMPOSE_USER_CACHE_KEY)) {
  loggedInUser = safeParseJSON(localStorage.getItem(COMPOSE_USER_CACHE_KEY));
}
const loggedInUserSubscriptions = new Set<(user: User) => void>();

const ensureSet = (name: string) =>
  (subscriptions[name] = subscriptions[name] || new Set());

const callbacks: {
  [key: string]: [(...args: any[]) => void, (error: string) => void];
} = {};
const getCallbacks = (name: string) => {
  return callbacks[name] || [() => void 0, () => void 0];
};

let socketOpen = false;
let queuedMessages: Request_[] = [];

let socket: WebSocket;

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

function send(data: Request) {
  const requestId = (Math.random() + 1).toString(36).substring(7);
  return new Promise<User>((resolve, reject) => {
    callbacks[requestId] = [resolve, reject];
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
  } else if (data.type === "LoginResponse") {
    if (data.token) {
      localStorage.setItem(COMPOSE_TOKEN_KEY, data.token);
      localStorage.setItem(COMPOSE_USER_CACHE_KEY, JSON.stringify(data.user));
      loggedInUser = data.user || null;
      getCallbacks(data.requestId)[0](data.user);
      loggedInUserSubscriptions.forEach((callback) =>
        callback(data.user as User)
      );
    } else if (data.error) {
      getCallbacks(data.requestId)[1](data.error);
    } else {
      // token already saved in localStorage, so just call the callback
      loggedInUser = data.user || null;
      getCallbacks(data.requestId)[0](data.user);
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
  if (socket) socket.close();

  try {
    socket = new WebSocket("ws://localhost:3000"); // TODO - point this to prod on releases
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

function useSubscription(name: string, setState: (data: unknown) => void) {
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

export function useCloudState(name: string, initialState: unknown) {
  const [state, setState] = useState(initialState);
  useSubscription(name, setState);
  return [state, (s: unknown) => setCloudState(name, s)];
}

//////////////////////////////////////////
// CLOUD REDUCER
//////////////////////////////////////////

export function dispatchCloudReducerEvent<A>(name: string, event: A) {
  send({
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
    reducer: (response: Response) => void
  ) => State;
}) {
  const [state, setState] = useState(initialState as unknown);
  useSubscription(name, setState);

  useEffect(() => {
    send({
      type: "RegisterReducerRequest",
      name,
      reducerCode: reducer.toString(),
      initialState,
    });
  }, [name, reducer.toString(), JSON.stringify(initialState)]);

  return [state, (s: State) => dispatchCloudReducerEvent(name, s)];
}

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
}): Promise<User> {
  redirectURL = redirectURL || window.location.href;
  return send({
    type: "SendMagicLinkRequest",
    email,
    appName,
    redirectURL,
  });
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
