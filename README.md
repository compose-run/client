# ComposeJS

### _a whole backend without leaving React_

Compose is a modern Firebase-alternative for React apps, featuring:

- cloud functions deployed on every save
- cloud versions of the react hooks you already 💖
  - `useState` -> `useCloudState`
  - `useReducer` -> `useCloudReducer`
- authentication & realtime web sockets built-in
- get started in seconds
- 100% serverless
- typescript bindings

# Table of Contents

- [Example App](#example-app)
- [Installation](#getting-started)
  - [Codesandbox Template](#codesandbox-template)
  - [NPM](#npm)
- [Tutorial](#tutorial)
- [API](#api)
  - [State Hooks](#state)
    - [`useCloudState`](#usecloudstate)
    - [`useCloudReducer`](#usecloudreducer)
  - [State Utilities](#state-utilities)
    - [getCloudState](#getcloudstate)
    - [`setCloudState`](#setcloudstate)
    - [`dispatchCloudAction`](#dispatchcloudaction)
  - [Users & Authentication](#users--authentication)
    - [`magicLinkLogin`](#magiclinklogin)
    - [`useUser`](#useuser)
- [FAQ](#faq)

# Example App

The Compose Community chat app is built on Compose. [Check out the code](https://github.com/compose-run/community) and [join the conversation](https://community.compose.run)!

# Installation

## Codesandbox Template

## Install via npm or yarn

```
npm install --save @compose-run/client
```

or

```
yarn add @compose-run/client
```

# Tutorial

# API

## State

### `useCloudState`

Where `useState` is a variable that holds state within a React Component, `useCloudState` is a cloud variable that syncs state across all instances of the same `name` parameter – for all users.

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

- `name` (_required_) is a globally unique identifier string.
- `initialState` (_required_) is the initial value for the state; can be any JSON object.

It returns an array of two values, used to get and set the value of state:

1. The current value of the state. It is `null` while the state is loading.
2. A function to set the state across all references to the `name` parameter.

#### Example usage

- TODO

### `useCloudReducer`

Like `useReducer`, `useCloudReducer` is for maintaining complex state. It allows you to supply a `reducer` function that _runs on the server_ to handle state update logic. For example, your reducer can disallow invalid or unauthenticated updates.

#### Example usage

- TODO

## Users & Authentication

TODO

### `User`

TODO

### `magicLinkLogin`

Login users to your app via magic link.

```ts
export function magicLinkLogin({
  email,
  appName,
  redirectURL,
}: {
  email: string;
  appName: string;
  redirectURL?: string;
}): Promise<User>;
```

#### Example usage

- TODO

### `useUser`

`useUser` is a React hook to get the current user. It either returns the current user or `null` if no user is not logged in.

```ts
useUser(): User | null
```

#### Example usage

- TODO

## State Utilities

### `getCloudState`

#### Example usage

- TODO

### `setCloudState`

#### Example usage

- TODO

### `dispatchCloudAction`

#### Example usage

- TODO

# FAQ

## What kind of state can I store?

You can store any JSON object.

#### How much data can I store?

Each `name` shouldn't hold more than **~25,000 objects or ~4MB** because all state needs to [fit into your users' browsers](https://joshzeigler.com/technology/web-development/how-big-is-too-big-for-json).

This limitation will be lifted when we launch **`useCloudQuery`** (_coming soon_).

#### How do I see & debug the current value of the state?

You can get the current value of the state as a `Promise` and log it:

```js
const testState = await getCloudState({ name: "test-state" });

console.log(testState);
```

You can print out all changes to cloud state from within a React component:

```js
const [testState, setTestState] = useCloudState({
  name: "test-state",
  initialState: [],
});

useEffect(() => console.log(testState), [testState]);
```

## Does it work offline?

Compose doesn't allow any offline editing. We may add a CRDT mode in the future which would enable offline edits.

## Pricing

- 10mb - free
- 1gb - $9 / month
- 100gb - $10 / month
- 1tb - $24 / month

# Contributing

## How to use

- Install dependencies `npm install`
- Build and rsync to `../compose-community` (expected as a sibling repo): `npm run build`

## File Structure

There are just two files, really:

- `index.ts`, which contains the whole library
- `shared-types.ts`, which contains all the types that are shared between the client and server

## Running & Testing

Currently the way I run & test this library is in the context of the `compose-community` project. The `npm run build` command will compile and sync the built version of the library to `compose-community`. (Unfortunately I haven't yet found a way to export the types to that repo, so you may have to recreate them there manually. Hopefully this will be solved when we package up this client library as a proper npm module.)
