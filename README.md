# ComposeJS

_A whole backend without leaving React_

ComposeJS provides realtime & persistent versions of the React hooks you already know. Authentication & realtime-updates built-in.

[ GIF here ]

## `useState`

Like `useState`, `useRealtimeState` is for maintaining simple state. By default, it syncs the state across all instances of the same `name` for all users.

![](https://user-images.githubusercontent.com/2288939/139447267-76a76bf7-f964-4f80-9c44-dd008e74fd8f.png)

[Try it out here!](TODO)

### FAQ

#### 1. How long will this data be persisted?

All state under ~1mb will be persisted for at least 48-hours without creating a developer account.

You can create a developer account the same way you'd create a user account:

```js
import { loginMagicLink } from '@compose-run/compose'

loginMagicLink('your_email@gmail.com').then(({userId}) => console.log(userId))
```

After clicking on the magic link in your inbox, you'll see your `userId` in the console. Add it to the `developer` field like this:

```js
useRealtimeState({name: 'test-state', initialState: [], developer: 'your-userId-here')
```

This links this piece of state to your account. You will be able to store a small amount of data (~10mb/developer account) for free indefinitely, and we will reach out to you via email to upgrade your account or export your data if you exceed that limit.

#### 2. Can I make realtime state private?

By default, anyone can get or set realtime state via its `name`. If you only want a known subset of users to be able to read or write, simply pass their `userId`s via `readers` and `writers`. For example:

```js
// allow `some-user-id` to read or write but `another-user-id` to only read
// nobody else can read or write
useRealtimeState({name: 'some-user-id/private state', initialState: [], readers: ['some-user-id', 'another-user-id'], writers: ['some-user-id']})
```

Read about how to log in a user below in **Authenticating Users**.

Soon, you will be able to write more complex authorization & validation logic via **`useRealtimeReducer`**.

#### 3. How much data can I store with `useRealtimeState`?

Each `name` shouldn't hold more than [**25,000 records (3.87MB)** because all state needs to fit into your user's browser](https://joshzeigler.com/technology/web-development/how-big-is-too-big-for-json). This limitation will be lifted when we launch **`useRealtimeQuery`**.

#### 4. What happens if two people set the state simultaneously?

* `onConflict: 'merge` (default)
* `onConflict: 'last-write-wins'`
* `onConflict: 'last-write-fails'`

`merge` is the default. We try to merge the edits as best we can. For example:

```js
useRealtimeState({name: 'test', initialState: []}) // merge is used by default
```

`last-write-wins` is the simplest, but you can lose data if two people edit simultaneously. For example:

```js
useRealtimeState({name: 'test', initialState: [], onConflict: 'last-write-wins'})
```

The safest is `last-write-fails`. It will detect that two users tried to edit at the same time, and block the second from editing. This will allow you to `catch` the failed write and allow the user to try again. For example:

```js
useRealtimeState({name: 'test', initialState: [], onConflict: 'last-write-fails'})
```

#### 6. Does it work offline?

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
      <input type="email" onKeyPress={(e} => e.key === Enter && loginMagicLink(e.target.value) disabled={awaitingMagicLink} />
      { awaitingMagicLink && <div>Check your inbox for the magic link</div> }
    </div>
  );
}
```

## `useRealtimeReducer` - _coming soon_

![](https://user-images.githubusercontent.com/2288939/139447266-d986daa8-2c49-4a9d-aed9-283abbf89864.png)

Like `useReducer`, `useRealtime` is for maintaining more complex state. By default, it syncs the state across all instances of the same `name` for all users. It allows you to supply a `reducer` function that _runs on the server_ to handle complex state update logic.


## `useRealtimeQuery` - _coming soon_

`useRealtimeQuery` will enable you to store more data at a `name` than can fit in the user's browser by allowing you to filter it _on the server_ before sending it to the client.

