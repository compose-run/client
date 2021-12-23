# ComposeJS – _a whole backend inside React_

Compose is a modern backend-as-a-service for React apps.

**Warning: This is beta software. There will be bugs, downtime, and unstable APIs.** (We hope to make up for the early, rough edges with white-glove service from our team.)

- Setup in seconds: `npm install @compose-run/client` or [CodeSandbox](https://codesandbox.io/s/wild-wildflower-vq2q4?fontsize=14&hidenavigation=1&theme=dark), no account required

- Cloud versions of the react hooks you already know & love:

  - [`useState`](https://reactjs.org/docs/hooks-state.html) -> [`useCloudState`](#usecloudstate)
  - [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) -> [`useCloudReducer`](#usecloudreducer)

- Authentication & realtime web sockets built-in

- 100% serverless

- Cloud functions, _deployed on every save!_

- TypeScript bindings

We're friendly! Come say hi or ask a question in [our Community chat](https://community.compose.run) 👋

# Table of Contents

- [ComposeJS – _a whole backend inside React_](#composejs--a-whole-backend-inside-react)
- [Table of Contents](#table-of-contents)
- [Guide](#guide)
  - [Introduction](#introduction)
  - [A simple example](#a-simple-example)
    - [Equivalent `useState` example](#equivalent-usestate-example)
  - [State](#state)
  - [Names](#names)
  - [An example with `useCloudReducer`](#an-example-with-usecloudreducer)
  - [Reducers run in the cloud](#reducers-run-in-the-cloud)
  - [Create a Developer Account (optional)](#create-a-developer-account-optional)
  - [Logging in a user](#logging-in-a-user)
  - [Permissions](#permissions)
  - [Breaking down walls](#breaking-down-walls)
- [Examples](#examples)
  - [`useCloudState` Counter](#usecloudstate-counter)
  - [`useCloudReducer` Counter](#usecloudreducer-counter)
  - [Login](#login)
  - [Compose Community Chat App](#compose-community-chat-app)
- [API](#api)
  - [`useCloudState`](#usecloudstate)
  - [`useCloudReducer`](#usecloudreducer)
    - [The Reducer Function](#the-reducer-function)
    - [Debugging](#debugging)
  - [`magicLinkLogin`](#magiclinklogin)
  - [`useUser`](#useuser)
  - [`globalify`](#globalify)
  - [`getCloudState`](#getcloudstate)
  - [`setCloudState`](#setcloudstate)
  - [`dispatchCloudAction`](#dispatchcloudaction)
- [FAQ](#faq)
  - [What kind of state can I store?](#what-kind-of-state-can-i-store)
  - [How much data can I store?](#how-much-data-can-i-store)
  - [How do I query the state?](#how-do-i-query-the-state)
  - [How do I debug the current value of the state?](#how-do-i-debug-the-current-value-of-the-state)
  - [Does it work offline?](#does-it-work-offline)
- [Pricing](#pricing)
- [Contributing](#contributing)
  - [How to use](#how-to-use)
  - [File Structure](#file-structure)
  - [Developing locally](#developing-locally)

# Guide

This guide describes the various concepts used in Compose, and how they relate to each other. To get a complete picture of the system, it is recommended to go through it in the order it is presented in.

## Introduction

Compose provides a set of tools for building modern React apps backed by a cloud database.

The design goal of Compose is to _keep you where you want to be: <ins>in your React components</ins>_. The whole system is built around React hooks and JavaScript calls. There's no CLI, admin panel, query language, or permissions language. It's just React and JavaScript, so you can focus solely on building your UI for your users. Using Compose should feel like you're building a local app – the cloud database comes for free.

Compose is simple. There are just two parts:

1. Cloud-versions of React's built-in hooks:

   - [`useState`](https://reactjs.org/docs/hooks-state.html) -> [`useCloudState`](#usecloudstate)
   - [`useReducer`](https://reactjs.org/docs/hooks-reference.html#usereducer) -> [`useCloudReducer`](#usecloudreducer)

2. Users & authentication

## A simple example

The simplest way to get started is [`useCloudState`](#usecloudstate). We can use it to make a cloud counter button:

```jsx
import { useCloudState } from "@compose-run/client";

function Counter() {
  const [count, setCount] = useCloudState({
    name: "examples/count",
    initialState: 0,
  });

  return (
    <div>
      <h1>Hello Compose</h1>
      <button onClick={() => setCount(count + 1)}>
        I've been clicked {count} times
      </button>
    </div>
  );
}
```

[![Edit Compose useCloudState Counter](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/wild-wildflower-vq2q4?fontsize=14&hidenavigation=1&theme=dark)

![compose-counter](https://user-images.githubusercontent.com/2288939/147256919-d5a8893c-5e48-4a3f-973f-65747b2ff1aa.gif)

### Equivalent `useState` example

If you've used `useState` before, this code should look familiar:

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

While Compose follows most React conventions, it does prefer named arguments to positional ones – except in cases of single-argument functions.

## State

A state in Compose is a cloud variable. It can be any JSON-serializable value. States are created and managed via the `useCloudState` and `useCloudReducer` hooks, which are cloud-persistent versions of React's built-in `useState` and `useReducer` hooks.

- `useCloudState` is simple. It returns the current value of the state, and a function to set it.

- `useCloudReducer` is more complex. You can't update the state directly. You have to dispatch an action to tell the reducer to update it. More on this below.

## Names

Each piece of state needs a name. Compose has a global namespace. One common way to avoid collisions is to prefix the name with your app's name, i.e. `"myApp/myState"`.

## An example with `useCloudReducer`

The simplicity of `useCloudState` are also its downsides: _anyone_ can set it _whenever_ to _anything_.

Enter `useCloudReducer`. It allows you to protect your state from illegal updates. Instead of setting the state directly, you dispatch an action to tell the reducer to update it.

We can update the simple counter example from above to `useCloudReducer`:

```jsx
import { useCloudReducer } from "@compose-run/client";

function Counter() {
  const [count, dispatchCountAction] = useCloudReducer({
    name: "count",
    initialState: 0,
    reducer: ({ previousState, action }) => {
      switch (action) {
        case "increment":
          return previousState + 1;
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    },
  });
  return (
    <button onClick={() => dispatchCountAction("increment")}>{count}</button>
  );
}
```

[![Edit Compose Counter (useCloudReducer)](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-usecloudreducer-counter-fyh8t?fontsize=14&hidenavigation=1&theme=dark)

The upsides of using `useCloudReducer` here are that we know:

1. the state will always be a number
2. the state will only every increase, one at a time
3. that we will never "miss" an update (each update is run on the server, in order)

## Reducers run in the cloud

Your reducer function runs in the cloud (on our servers) every time it receives an action.

We get your reducer code on the server by calling `.toString()` on your function and sending it to the server. This is how we're able to _deploy your function on every save._ Every time you change the function, we update it on the server instantly.

If someone else tries to change the function, we'll throw an error. Whoever is logged in when a reducer's name is first used is the "owner" of that reducer, and the only one who can change it.

Currently the reducer function is extremely limited in what it can do. It cannot depend on any definitions from outside itself, require any external dependencies, or make network requests. These capabilities will be coming shortly. For now, reducers are used to validate, sanitize, and authorize state updates.

Any `console.log` calls or errors thrown inside your reducer will be streamed to your browser if you're are online. If not, those debug messages will be emailed to you.

## Create a Developer Account (optional)

If you've been following along, you know that you don't have to create an account to get started with Compose.

However, it only takes 10 seconds (literally), and it will give you access to the best Compose features for free!

```js
import { magicLinkLogin } from "@compose-run/client";

magicLinkLogin({
  email: "your-email@gmail.com",
  appName: "Your New Compose App",
});
```

[![Edit Compose Developer Account](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-developer-account-kv1jv?fontsize=14&hidenavigation=1&theme=dark)

Then click the magic link in your email.

Done! Your account is created, and you're logged into Compose in whatever tab you called that function.

## Logging in a user

Logging in users is just as easy as creating a developer account. In fact, it's the same function.

Let's add a simple Login UI to our counter app:

```jsx
import { magicLinkLogin } from "@compose-run/client";

function Login() {
  const [email, setEmail] = useState("");
  const [loginEmailSent, setLoginEmailSent] = useState(false);

  if (loginEmailSent) {
    return <div>Check your email for a magic link to log in!</div>;
  } else {
    return (
      <div style={{ display: "flex" }}>
        <h1>Login</h1>
        <input onChange={(e) => setEmail(e.target.value)} />
        <button
          onClick={async () => {
            await magicLinkLogin({ email, appName: "My App" });
            setLoginEmailSent(true);
          }}
        >
          Login
        </button>
      </div>
    );
  }
}

function App() {
  const user = useUser();
  if (user) {
    return <Counter />;
  } else {
    return <Login />;
  }
}
```

[![Edit Compose Login Users & Authenticated Count](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-login-users-authenticated-count-28mo1?fontsize=14&hidenavigation=1&theme=dark)

## Permissions

Let's prevent unauthenticated users from incrementing the counter:

```jsx
import { useCloudReducer } from "@compose-run/client";

function Counter() {
  const [count, dispatchCountAction] = useCloudReducer({
    name: "count",
    initialState: 0,
    reducer: ({ previousState, action, userId }) => {
      if (!userId) {
        throw new Error("Unauthenticated");
      }

      switch (action) {
        case "increment":
          return previousState + 1;
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    },
  });
  return (
    <button onClick={() => dispatchCountAction("increment")}>{count}</button>
  );
}
```

[![Edit Compose Login Users & Authenticated Count](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-login-users-authenticated-count-28mo1?fontsize=14&hidenavigation=1&theme=dark)

## Breaking down walls

Compose strives to break down unnecessary boundaries, and rethink the backend interface from first principles. Some concepts from other backend frameworks are not present in Compose.

Compose has no concept of an "app". It only knows about state and users. Apps are collections of state, presented via a UI. The state underpinning a Compose app is free to be used seamlessly inside other apps. This breaks down the walls between app data silos, so we can build more cohesive user experiences. Just like Stripe remembers your credit card across merchants, Compose remembers your states across apps.

A user's Compose `userId` is the same no matter who which Compose app they login to – as long as they use the same email address. This enables you to embed _first-class, fullstack components_ from other Compose apps into your app, and have the same user permissions flow through.

Finally, you'll notice that there is no distinction between a developer account and a user account in Compose. We want all users to have a hand in shaping their digital worlds. This starts by treating everyone as a developer from day one.

# Examples

## `useCloudState` Counter

```jsx
import { useCloudState } from "@compose-run/client";

function Counter() {
  const [count, setCount] = useCloudState({
    name: "examples/count",
    initialState: 0,
  });

  return (
    <div>
      <h1>Hello Compose</h1>
      <button onClick={() => setCount(count + 1)}>
        I've been clicked {count} times
      </button>
    </div>
  );
}
```

[![Edit Compose useCloudState Counter](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/wild-wildflower-vq2q4?fontsize=14&hidenavigation=1&theme=dark)

## `useCloudReducer` Counter

```jsx
import { useCloudReducer } from "@compose-run/client";

function Counter() {
  const [count, dispatchCountAction] = useCloudReducer({
    name: "count",
    initialState: 0,
    reducer: ({ previousState, action }) => {
      switch (action) {
        case "increment":
          return previousState + 1;
        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    },
  });
  return (
    <button onClick={() => dispatchCountAction("increment")}>{count}</button>
  );
}
```

[![Edit Compose Counter (useCloudReducer)](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-usecloudreducer-counter-fyh8t?fontsize=14&hidenavigation=1&theme=dark)

## Login

```jsx
import { magicLinkLogin } from "@compose-run/client";

function Login() {
  const [email, setEmail] = useState("");
  const [loginEmailSent, setLoginEmailSent] = useState(false);

  if (loginEmailSent) {
    return <div>Check your email for a magic link to log in!</div>;
  } else {
    return (
      <div style={{ display: "flex" }}>
        <h1>Login</h1>
        <input onChange={(e) => setEmail(e.target.value)} />
        <button
          onClick={async () => {
            await magicLinkLogin({ email, appName: "My App" });
            setLoginEmailSent(true);
          }}
        >
          Login
        </button>
      </div>
    );
  }
}

function App() {
  const user = useUser();
  if (user) {
    return <div>Hello, {user.email}!</div>;
  } else {
    return <Login />;
  }
}
```

[![Edit Compose Login Users & Authenticated Count](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/compose-login-users-authenticated-count-28mo1?fontsize=14&hidenavigation=1&theme=dark)

## Compose Community Chat App

The Compose Community chat app is built on Compose. [Check out the code](https://github.com/compose-run/community) and [join the conversation](https://community.compose.run)!

# API

## `useCloudState`

`useCloudState` is React hook that syncs state across all instances of the same `name` parameter.

```ts
useCloudState<State>({
  name,
  initialState,
}: {
  name: string,
  initialState: State,
}) : [State | null, (State) => void]
```

`useCloudState` requires two named arguments:

- `name` (_required_) is a globally unique identifier string
- `initialState` (_required_) is the initial value for the state; can be any JSON object

It returns an array of two values, used to get and set the value of state, respectively:

1. The current value of the state. It is `null` while the state is loading.
2. A function to set the state across all references to the `name` parameter.

## `useCloudReducer`

`useCloudReducer` is React hook for persisting complex state. It allows you to supply a `reducer` function that _runs on Compose's servers_ to handle state update logic. For example, your reducer can disallow invalid or unauthenticated updates.

```ts
function useCloudReducer<State, Action, Response>({
  name,
  initialState,
  reducer,
}: {
  name: string;
  initialState: State | Promise<State>;
  reducer: ({
    previousState,
    action,
    resolve,
    userId,
  }: {
    previousState: State;
    action: Action;
    resolve: (response: Response) => void;
    userId: number | null;
  }) => State;
}): [State | null, (action?: Action) => Promise<Response>];
```

`useCloudReducer` requires three named arguments:

- `name` (_required_) is a globally unique identifier string
- `initialState` (_required_) is the initial value for the state; can be any JSON object
- `reducer` (_required_) is a function that takes the current state, an action and context, and returns the new state

It returns an array of two values, used to get the value of state and dispatch actions to the reducer, respectively:

1. The current value of the state. It is `null` while the state is loading.
2. A function to dispatch actions to the cloud reducer. It returns a `Promise` that resolves when the reducer calls `resolve` on that action. (If the reducer doesn't call `resolve`, the `Promise` never resolves.)

### The Reducer Function

The reducer function runs on the Compose servers, and is updated every time it is changed – as long as its changed by its original creator. It cannot depend on any definitions from outside itself, require any external dependencies, or make network requests.

The reducer itself function accepts three four named arguments:

- `previousState` - the state before the action was dispatched

- `action` - the action that was dispatched

- `userId` - the dispatcher user's Compose `userId` (or `null` if none)

- `resolve` - a function that you can call to resolve the Promise returned by the `dispatch` function

It returns the new state.

### Debugging

The reducer function is owned by whoever created it. Any `console.log` calls or errors thrown inside the reducer will be streamed to that user's browser console if they are online. If not, those debug messages will be emailed to them.

Compose discards any actions that do not return a new state or throw an error, and leave the state unchanged.

## `magicLinkLogin`

Login users via magic link.

```ts
function magicLinkLogin({
  email,
  appName,
  redirectURL,
}: {
  email: string;
  appName: string;
  redirectURL?: string;
}): Promise<null>;
```

It accepts two required named arguments and one optional named argument:

- `email` - (_required_) the email address of the user
- `appName` - (_required_) the name of the app in the magic email link that is sent to the user
- `redirectURL` - (_optional_) the URL to redirect to after the user logs in. It defaults to the current `window.location.href` if not provided.

It returns a `Promise` that resolves when the magic link email is successfully sent.

## `useUser`

`useUser` is a React hook to get the current user (`{email, id}`) or `null` if no user is logged in.

```ts
useUser(): {email : string, id: number} | null
```

## `globalify`

`globalify` is useful utility for adding all of Compose's function to your global `window` namespace for easy access in the JS console.

## `getCloudState`

`getCloudState(name: string)` returns a `Promise` that resolves to the current value of the named state.

It works for states created via either `useCloudState` and `useCloudReducer`.

## `setCloudState`

`setCloudState(name : string)` is a utility function for setting state.

It can be used outside of a React component. It is also useful for when you want to set state without getting it.

It will fail to set any states with attached reducers, because those can only be updated by dispatching an action to the reducer.

## `dispatchCloudAction`

`dispatchCloudAction<Action>({name: string, action: Action})` is a utility function for dispatching actions to reducers.

It can be used outside of a React component. It is also useful for when you want to dispatch actions without getting the state.

# FAQ

## What kind of state can I store?

You can store any JSON object.

## How much data can I store?

Each `name` shouldn't hold more than **~25,000 objects or ~4MB** because all state needs to [fit into your users' browsers](https://joshzeigler.com/technology/web-development/how-big-is-too-big-for-json).

This limitation will be lifted when we launch **`useCloudQuery`** (_coming soon_).

## How do I query the state?

Each named state in Compose is analogous to a database table. However instead of using SQL or another query language, you simply use client-side JavaScript to slice and dice the state to get the data you need.

Of course this doesn't scale past what state fits inside the user's browser. However we find that this limitation is workable for prototyping an MVP of up to hundreds of active users.

We plan to launch `useCloudQuery` soon, which will enable you to run _server-side JavaScript_ on your state before sending it to the client, largely removing this size limitation, while still keeping the JavaScript as the "query language".

## How do I debug the current value of the state?

You can get the current value of the state as a `Promise` and log it:

```js
const testState = await getCloudState({ name: "test-state" });

console.log(testState);
```

You may need to use [`globalify`](#globalify) to get access to Compose functions (like `getCloudState`) in your JS console.

You can also print out all changes to cloud state from within a React component:

```js
const [testState, setTestState] = useCloudState({
  name: "test-state",
  initialState: [],
});

useEffect(() => console.log(testState), [testState]);
```

## Does it work offline?

Compose doesn't allow any offline editing. We plan to add a CRDT mode in the future which would enable offline edits.

# Pricing

Compose is currently free while we work on a pricing model.

# Contributing

## How to use

- Install dependencies `npm install`
- Build `npm run build`

## File Structure

There are just two files:

- `index.ts`, which contains the whole library
- `shared-types.ts`, which contains all the types that are shared between the client and server

## Developing locally

You can use `npm link` if you want to test out changes to this client library in another project locally. For example, let's say we wanted to test out a change to this client library in the `@compose-run/community`repo:

1. In this repo, run `npm link`
2. In this repo, run `npm link ../community/node_modules/react` [^1]
3. In `@compose-run/community`, run `npm link @compose-run/client`
4. In this repo, run `npm run build`

`npm link` can be tricky to get working, particularly because you have to link two repos in this case! `npm ls` and `npm ls -g` can be handy for debugging. Additionally, deleting your `node_modules` directory and `npm install`ing from scratch can be helpful.

[1]: This step is to stop React from complain that you're "breaking the rules of hooks" by having "more than one copy of React in the same app", as described in the [React docs](https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react).
