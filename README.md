# ComposeJS

_A whole backend without leaving React_

Realtime & persistent versions of the React hooks you already know. 100% severless. Authentication & realtime built-in. Get started in seconds.

![](https://user-images.githubusercontent.com/2288939/139447267-76a76bf7-f964-4f80-9c44-dd008e74fd8f.png)

## `useState`

Like `useState`, `useRealtimeState` is for maintaining simple state. By default, it syncs the state across all instances of the same `name` for all users.

Try opening this page in two tabs to see how data sync across them:

[ embedded codesandbox here ]

### FAQ

#### 1. How long will this data be persisted?

All state under 1mb will be persisted for 48-hours without being tied to an account.

To tie your data to your account, first obtain your `userId` by logging in:

```js
import { loginMagicLink } from '@compose-run/compose'

loginMagicLink('your_email@gmail.com')
  .then(({userId}) => console.log(userId))
```

After clicking on the magic link in your inbox, you'll see your `userId` in the console. Add it to the `developer` field like this:

```js
useRealtimeState({
  name: 'test-state', 
  initialState: [], 
  developer: 'your-userId-here'
})
```

By linking a piece of named state to your `userId`, you sign yourself up to pay for that state when it exceeds our free limit. You will be able to store a small amount of data (10mb/developer account) on your account for free indefinitely. We will reach out to you via email to upgrade your account or export your data if you exceed that limit.

#### 2. How do I see & debug the current value of the state?

You can print out changes to some `state` from within a React component:

```js
const [state, setState] = useRealtimeState({name: 'test-state', initialState: []})

useEffect(() => console.log(state), [state])
```

You can also get the current value of the state via a `Promise` and log it:

```js
getRealtimeState({name: 'test-state'})
  .then(console.log)
```

#### 3. Is data namespaced or all global?

Data is global by default, but you can add your own namespace via `/`s. If you add a user's `userId`s in the `name` path, it will allow that user to read and write the state. If the `name` has no `userId`s in its path, it will be globally readable and writable.

Even if you want your state to be publicly readable and writable, it's commonn to add your project's name as a prefix to prevent `name` collisions with others:

```js
useRealtimeState({
  name: 'my-super-duper-unique-project/some-state', 
  initialState: []
})
```

#### 4. Can I make realtime state private?

By default, anyone can get or set realtime state via its `name`. You can make a state private by nesting it under a `userId` (obtained after authenticating them):

```js
const currentUser = useCurrentUser()

// only the current user can read or write this state
useRealtimeState({
  name: `${currentUser.userId}/private state`, 
  initialState: []
})
```

Not even you, the developer, will be able to read or write this state. You can add yourself as a reader & writer by adding your `userId` to the path:

```js
useRealtimeState({
  name: `${DEVELOPER_USER_ID}/${currentUser.userId}/private state`,
  initialState: []
})
```

You can nest arbitrarily many `userId`s like this to create a piece of state that those users can all read and write together. The order of the `userId`s doesn't matter for access control.

You will be able to write more complex authorization & validation logic via **`useRealtimeReducer`** (_coming soon_).

#### 5. How do I make my app reslient to invalid writes?

A clever user can set your state in unexpected ways, so it's good practice to validate your data and try to recover from invalid writes as best you can. Below is an example using the `zod` parsing library:

```
import * as zod from 'zod'

const messagesSchema = zod.array(zod.string())

const [ messages, setMessages ] = useRealtimeState({
  name: 'my-chat-app/messages',
  initialState: []
})

useEffect(() => {
  try {
    messagesSchema.parse(messages)
  } catch (e) 
    setMessages([])
  }
}, [messages])  

```

#### 6. How much data can I store with `useRealtimeState`?

Each `name` shouldn't hold more than **25,000 records (3.87MB)** because all state needs to [fit into your user's browser](https://joshzeigler.com/technology/web-development/how-big-is-too-big-for-json). 

This limitation will be lifted when we launch **`useRealtimeQuery`** (_coming soon_).

#### 7. What happens if two people set the state simultaneously?

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

#### 8. Does it work offline?

Compose doesn't allow any offline editing. We may add a CRDT mode in the future which would enable offline edits.

## Authenticating Users

Compose currently only offers magic link login, where users supply their email address, and login via clicking the link sent to their inbox.

```js
import { loginMagicLink, useCurrentUser, awaitingMagicLink } from '@compose-run/compose'

export default LoginOrCreateAccount() {
  const currentUser = useCurrentUser()
  const [loggingIn, setLoggingIn] = useState(false)
  
  
  if (currentUser) {
    window.location.href = '/home'
  }
  
  return (
    <div>
      Login via magic link
      <input 
        type="email" 
        onKeyPress={(e} => e.key === Enter && loginMagicLink(e.target.value)} 
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

