# ComposeJS

## _A whole backend without leaving React_

Compose is a Firebase-alternative for React. Code your backend from your frontend.

- Cloud functions deployed on every save
- Realtime & persistent versions of the React hooks you already ❤️
  - `useState` -> `useCloudState`
  - `useReducer` -> `useCloudReducer`
- Authentication & realtime web sockets built-in
- Get started in seconds
- 100% serverless

## `useCloudState`

Where `useState` is a variable that holds state within a React Component, `useCloudState` is a cloud variable that syncs state across all instances of the same `name` parameter – for all users.

```ts
useCloudState<State>({
  name,
  initialState,
  developer
}: {
  name: string,
  initialState: State,
  developer?: string,
}) : [State | null, (State) => void]
```

`useCloudState` requires two named arguments and one optional named argument:

- `name` (_required_) is a globally unique identifier string.
- `initialState` (_required_) is the initial value for the state; can be an JSON object.

It returns an array of two values, used to get and set the value of state:

- The first value represents the current value of the state. It is `null` while the state is loading.
- The second value is used to set the state across all references to that `name` – for all users.

## `useCloudReducer`

Like `useReducer`, `useCloudReducer` is for maintaining complex state. It allows you to supply a `reducer` function that _runs on the server_ to handle state update logic. For example, your reducer can disallow invalid or unauthenticated updates.

## `useCloudQuery` - _coming soon_

`useCloudQuery` will enable you to store more data at a `name` than can fit in the user's browser by allowing you to filter it _on the server_ before sending it to the client.

## Authentication & Users

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

### Example

```js
import { magicLinkLogin, useCurrentUser } from "@compose-run/compose-client";

function Login() {
  const currentUser = useCurrentUser();
  if (currentUser) {
    return <Home />;
  }

  const [loggingIn, setLoggingIn] = useState(false);
  function login(email) {
    setLoggingIn(true);
    magicLinkLogin(e.target.value);
  }

  return (
    <div>
      Login via magic link
      <input
        type="email"
        onKeyPress={(e) => e.key === Enter && login(e.target.value)}
        disabled={loggingIn}
      />
      {loggingIn && <div>Check your inbox for the magic link</div>}
    </div>
  );
}
```

### Example Todo App

```js
import {
  magicLinkLogin,
  useCurrentUser,
  useCloudState,
  uuid,
  logout,
} from "@compose-run/compose";

function Login() {
  const currentUser = useCurrentUser();
  if (currentUser) {
    return <TodoList />;
  }

  const [loggingIn, setLoggingIn] = useState(false);

  function login(email) {
    setLoggingIn(true);
    magicLinkLogin(e.target.value);
  }

  return (
    <div>
      Login via magic link
      <input
        type="email"
        onKeyPress={(e) => e.key === Enter && login(e.target.value)}
        disabled={loggingIn}
      />
      {loggingIn && <div>Check your inbox for the magic link</div>}
    </div>
  );
}

function TodoList() {
  const currentUser = useCurrentUser();
  if (!currentUser) {
    return <Login />;
  }

  const [todos, setTodos] = useCloudState({
    name: `/${currentUser.id}/todos`,
    initialState: [],
  });

  function newTodo(text) {
    setTodos([
      ...todos,
      { text: e.target.value, completed: false, id: uuid() },
    ]);
  }

  function toggleTodo(id) {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function deleteTodo(id) {
    setTodos(todos.filter((todo) => todo.id !== id));
  }

  return (
    <div>
      <div>
        <div>{currentUser.email}</div>
        <div>
          <button onClick={() => logout()}>Logout</button>
        </div>
      </div>
      <h1>Todo List</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <button onClick={deleteTodo(todo.id)}>X</button>
            <input
              type="checkbox"
              value={todo.completed}
              onClick={toggleTodo(todo.id)}
            />
            {todo.text}
          </li>
        ))}
      </ul>
      <input onKeyPress={(e) => e.key === Enter && newTodo(e.target.value)} />
    </div>
  );
}

export function App() {
  return <Login />;
}
```

### FAQ

#### What kind of state can I store?

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

#### Does it work offline?

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

- `shared-types.ts`, which is just a symlink from `compose-node/src/shared-types.ts`
- `index.ts`, which contains the whole library

## Running & Testing

Currently the way I run & test this library is in the context of the `compose-community` project. The `npm run build` command (which you need to run in this directory, not the top-level directory) will compile and sync the built version of the library to `compose-community`. (Unfortunately I haven't yet found a way to export the types to that repo, so you may have to recreate them there manually. Hopefully this will be solved when we package up this client library as a proper npm module.)

Of course we'll also eventually want tests in this repo itself, but for now, I think simply using the library ourselves in `compose-community` is sufficient to catch most of the bugs.
