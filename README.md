# ComposeJS

_A whole backend without leaving React_

* Realtime & persistent versions of the React hooks you already know
* 100% Severless
* Authentication & realtime built-in
* Get started in seconds – no account required

![](https://user-images.githubusercontent.com/2288939/139447267-76a76bf7-f964-4f80-9c44-dd008e74fd8f.png)

TODO: fix the import path to '@compose-run/compose' & switch all "server"s to "cloud"

## `useRealtimeState`

Where `useState` is like a variable that holds state within a React Component, `useRealtimeState` is like a cloud variable that syncs state across all instances of the same `name` parameter – for all users.

Try opening this page in two tabs to see how data sync across them:

[ TODO - embedded codesandbox here ]

### API

```ts
useRealtimeState<State>({
  name, 
  initialState, 
  developer
}: {
  name: string, 
  initialState: State, 
  developer?: string, 
}) : [State | null, (State) => void]
```

`useRealtimeState` requires two named arguments and one optional named argument:

* `name` (_required_) is a globally unique identifier string. 
* `initialState` (_required_) is the initial value for the state; can be an JSON object. 
* `developer` (_optional_) is the `userId` for the application's developer (that's you!). If it is not supplied, the state is limited to 1mb and will only last 48 hours. 

It returns an array of two values, used to get and set the value of state:

* The first value represents the current value of the state. It is `null` while the state is loading.
* The second value is used to set the state across all references to that `name` – for all users.

### Example Todo App

```
import { loginMagicLink, useCurrentUser, awaitingMagicLink, uuid, logout } from '@compose-run/compose'

function Login() {
  const currentUser = useCurrentUser()
  if (currentUser) {
    return <TodoList />
  }

  return (
    <div>
      Login via magic link
      <input 
        type="email" 
        onKeyPress={(e) => e.key === Enter && loginMagicLink(e.target.value)} 
        disabled={awaitingMagicLink} 
      />
      { awaitingMagicLink && 
          <div>Check your inbox for the magic link</div> 
      }
    </div>
  );
}

function TodoList() {
  const currentUser = useCurrentUser()
  if (!currentUser) {
    return <Login />
  }

  const [ todos, setTodos ] = useRealtimeState({
    name: `/${currentUser.id}/todos`,
    initialState: []
  })

  function newTodo(text) {
    setTodos([...todos, {text: e.target.value, completed: false, id: uuid()}])
  }

  function toggleTodo(id) {
    setTodos(todos.map(todo => todo.id === id ? {...todo, completed: !todo.completed} : todo))
  }

  function deleteTodo(id) {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div>
      <div>
        <div>{currentUser.email}</div>
        <div><button onClick={() => logout()}>Logout</button></div>
      </div>  
      <h1>Todo List</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <button onClick={deleteTodo(todo.id)}>
              X
            </button>
            <input 
              type="checkbox" 
              value={todo.completed} 
              onClick={toggleTodo(todo.id)
            }/>
            {todo.text}
          </li>
        ))}
      </ul>
      <input onKeyPress={(e) => e.key === Enter && newTodo(e.target.value)} />
    </div>
  );
}

export function App() {
  return <Login />
}
```

### FAQ

#### How long will this data be persisted?

All state under 1mb will be persisted for 48-hours without being link to an account. Give it a spin, go win a hackathon – without even signing up.

#### How do I persist data longer than 48 hours?

To link state to your account, add `developer: 'your-userId-here'` to the state:

```js
useRealtimeState({
  name: 'test-state', 
  initialState: [], 
  developer: 'your-userId-here'
})
```

To obtain your `userId`, login via your email address and print it to the console:

```js
import { loginMagicLink } from '@compose-run/compose'

const { userId } = await loginMagicLink('your-email@gmail.com')

console.log(userId)
```

After clicking on the magic link in your inbox, copy your `userId` from the console.

By linking a piece of state to your `userId`, you sign yourself up to pay for that state when it exceeds our free limit. You will be able to store a small amount of data (10mb/developer account) on your account for free indefinitely. We will reach out to you via email to upgrade your account or export your data if you exceed that limit.

#### What if someone else signs me up to pay for state I don't want to pay for?

When you (or someone else) adds your `userId` under the `developer` field of the state, we will add that state to your tab in much the same way that you would charge a drink to your hotel room. 

Before we charge your bill,  we will confirm the all the state `name`s that linked to your account, and allow you to remove any that you do not wish to maintain.

We plan to soon allow you to explicitly register names that you wish to maintain. For example, you could pemit users of your app to maintain certain kinds of named state, and automatically disallow any other state attempting to be linked to your account.

#### What kind of state can I store?

You can store any JSON object. We reccomend that each piece of state be an `Array` of flat objects, much like a SQL table.

We eventually plan to support other JavaScript types, such as `Set` and `File`.

#### How should I organize my state?

We advise against nesting your data. 

We recommend that you store your data in flat, normalized `Array`s and link between objects via their IDs:

```jsx
import { useRealtimeState, uuid, ServerTimestamp, useCurrentUser } from '@compose-run/compose'


function ChatApp() {
  const currentUser = useCurrentUser()

  const [messages, setMessages] = useRealtimeState({
    name: 'CHANGE-ME/messages',
    initialState: []
  })  

  function sendMessage(newMessageText) {
    setMessages([
      ...messages,
      { 
        id: uuid(), 
        text: newMessageText, 
        author: currentUser.id
        createdAt: ServerTimestamp,  
      }
    ])
  }
  
  return <div> { /* render messages & use sendMessage here */ } </div>
}
```

#### How much data can I store?

Each `name` shouldn't hold more than **25,000 records (3.87MB)** because all state needs to [fit into your user's browser](https://joshzeigler.com/technology/web-development/how-big-is-too-big-for-json). 

This limitation will be lifted when we launch **`useRealtimeQuery`** (_coming soon_).

#### How do I see & debug the current value of the state?

You can print out changes to realtime state from within a React component:

```js
const [testState, setTestState] = useRealtimeState({
  name: 'test-state', 
  initialState: []
})

useEffect(() => console.log(testState), [testState])
```

You can also get the current value of the state as a `Promise` and log it:

```js
const testState = await getRealtimeState({name: 'test-state'})

console.log(testState)
```

#### Is data namespaced or all global?

Data is global by default, but you can add your own namespace via `/`s. If you add a user's `userId`s in the `name` path, it will allow that user to read and write the state. If the `name` has no `userId`s in its path, it will be globally readable and writable.

Even if you want your state to be publicly readable and writable, it's commonn to add your project's name as a prefix to prevent `name` collisions with others:

```js
useRealtimeState({
  name: 'my-super-duper-unique-project/some-state', 
  initialState: []
})
```

#### Can I make realtime state private?

By default, anyone can get or set realtime state via its `name`. You can make a state private by nesting it under a `userId` (obtained after authenticating them):

```js
const currentUser = useCurrentUser()

// only the current user can read or write this state
useRealtimeState({
  name: `${currentUser.userId}/private state`, 
  initialState: []
})
```

Not even you, the developer, will be able to read or write this state. You can add yourself as a reader & writer to your user's state by adding your own `userId` to the path:

```js
useRealtimeState({
  name: `${DEVELOPER_USER_ID}/${currentUser.userId}/private state`,
  initialState: []
})
```

You can nest arbitrarily many `userId`s like this to create a piece of state that those users will be able to read and write together. Imagine a private folder on a user's computer. Now imagine creating another folder nested inside that one and giving another user access to the inner folder:

```
/user-1 (only user-1 can read and write)
  /user-2 (user-1 and user-2 can read and write)
    /user-3 (user-1, user-2, and user-3 can read and write)
```

You will be able to write more complex authorization & validation logic via **`useRealtimeReducer`** (_coming soon_).

#### Can I make writes private but reads public?

Currently you can hack this by syncing private state to a public name:

```js
const [ privateState, setPrivateState ] = userRealtimeState({
  name: `${currentUser.id}/my-state`,
  initialValue: 'only I can change this'
})

const [publicMirror, setPublicMirror ] = useRealtimeState({
  name: `${currentUser.id}-my-state`
  initialValue: privateState
})

useEffect(() => setPublicMirror(privateState), [privateState])
```

#### How do I make my app reslient to invalid writes?

A clever user can read your source and set your state in unexpected ways, so it's good practice to validate your data and try to recover from invalid writes as best you can. Below is an example using the `zod` parsing library:

```js
import * as zod from 'zod'

const messagesSchema = zod.array(zod.string())

const [ messages, setMessages ] = useRealtimeState({
  name: 'my-chat-app/messages',
  initialState: []
})

useEffect(() => {
  try {
    // validate messages is an array of strings
    messagesSchema.parse(messages)
  } catch (e)
    // try to filter out anything but strings
    // or reset to the empty list
    setMessages(Array.isArray(messages)
      ? messages.filter(m => typeof m === 'string') 
      : []
    )
  }
}, [messages])  

```

#### What happens if two people set the state simultaneously?

* `onConflict: 'merge` (default)
* `onConflict: 'last-write-wins'`
* `onConflict: 'last-write-fails'`

`merge` is the default. We try to merge the edits as best we can. For example:

```js
const [test, setTest] = useRealtimeState({
  name: 'test', 
  initialState: []
}) // merge is used by default

setTest(['a', 'b'])

setTest(['a', 'c'])

// test == ['a', 'b', 'c']
```

`last-write-wins` is the simplest, but you can lose data if two people edit simultaneously. For example:

```js
const [test, setTest] = useRealtimeState({
  name: 'test', 
  initialState: [], 
  onConflict: 'last-write-wins'
})

setTest(['a', 'b'])

setTest(['a', 'c'])

// test == ['a', 'c']
```

The safest is `last-write-fails`. It will detect that two users tried to edit at the same time, and block the second from editing. This will allow you to `catch` the failed write and allow the user to try again. For example:

```js
const [test, setTest] = useRealtimeState({
  name: 'test', 
  initialState: [], 
  onConflict: 'last-write-fails'
})

setTest(['a', 'b'])

setTest(['a', 'c']) // throws exception

// test == ['a', 'b']
```

#### Does it work offline?

Compose doesn't allow any offline editing. We may add a CRDT mode in the future which would enable offline edits.

## Authenticating Users

Compose currently only offers magic link login, where users supply their email address, and login via clicking the link sent to their inbox.

```js
import { loginMagicLink, useCurrentUser, awaitingMagicLink } from '@compose-run/compose'

function Login() {
  const currentUser = useCurrentUser()
  if (currentUser) {
    return <Home />
  }

  return (
    <div>
      Login via magic link
      <input 
        type="email" 
        onKeyPress={(e) => e.key === Enter && loginMagicLink(e.target.value)} 
        disabled={awaitingMagicLink} 
      />
      { awaitingMagicLink && 
          <div>Check your inbox for the magic link</div> 
      }
    </div>
  );
}
```

## `useRealtimeReducer` - _coming soon_

![](https://user-images.githubusercontent.com/2288939/139447266-d986daa8-2c49-4a9d-aed9-283abbf89864.png)

Like `useReducer`, `useRealtime` is for maintaining more complex state. By default, it syncs the state across all instances of the same `name` for all users. It allows you to supply a `reducer` function that _runs on the server_ to handle complex state update logic.


## `useRealtimeQuery` - _coming soon_

`useRealtimeQuery` will enable you to store more data at a `name` than can fit in the user's browser by allowing you to filter it _on the server_ before sending it to the client.

## Pricing 

* 10mb - free
* 1gb - $9 / month
* 100gb - $10 / month
* 1tb - $24 / month

