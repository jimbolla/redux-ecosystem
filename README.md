# redux-replicate

[![build status](https://img.shields.io/travis/loggur/redux-replicate/master.svg?style=flat-square)](https://travis-ci.org/loggur/redux-replicate) [![npm version](https://img.shields.io/npm/v/redux-replicate.svg?style=flat-square)](https://www.npmjs.com/package/redux-replicate)
[![npm downloads](https://img.shields.io/npm/dm/redux-replicate.svg?style=flat-square)](https://www.npmjs.com/package/redux-replicate)

Creates a [Redux](https://github.com/rackt/redux) store enhancer designed to replicate actions and states.


## Table of contents

1.  [Installation](#installation)
2.  [Why?](#why)
3.  [Exports](#exports)
  - [Default export](#default-export)
  - [Utilities](#utilities)
  - [Action types](#action-types)
4.  [Usage](#usage)
  - [key](#key)
  - [reducerKeys](#reducerkeys)
  - [queryable](#queryable)
  - [create](#create)
  - [clientState](#clientstate)
  - [replicator](#replicator)
5.  [Replicators](#replicators)
  - [getInitialState](#getinitialstate)
  - [onReady](#onready)
  - [onStateChange](#onstatechange)
  - [postReduction](#postreduction)
  - [handleQuery](#handlequery)
6.  [Store modifications](#store-modifications)
  - [key](#storekey)
  - [setKey](#storesetkey)
  - [setState](#storesetstate)
  - [replication](#storereplication)
  - [onReady](#storeonready)
  - [readyCallbacks](#storereadycallbacks)
  - [initializedReplication](#storeinitializedreplication)
7.  [Example replicator](#example-replicator)
8.  [Example using `react-redux-provide`](#example-using-react-redux-provide)
9.  [Example using `compose`](#example-using-compose)


## Installation

```
npm install redux-replicate --save
```


## Why?

Many times you'll find yourself manually retrieving data and updating the state(s) of your store(s) based on the result.  This library allows you to do this automatically and in a modular way.

Replication is a key concept when building any stateful application.  When implemented correctly, it allows you to decouple data initialization, storage, and retrieval from your application so that your only concern is rendering its state.  It allows you declaratively connect application state to data sources and create efficient, scalable, and reliable software with minimal effort.

You can:

* Replicate specific state keys to some data source (database, API, etc.) whenever they change.

* Replicate the entire state to some data source (database, API, etc.) whenever anything changes.

* Automatically initialize state from some data source, synchronously or asynchronously.

* Give the server full authority over the initial state and/or allow the client to override the initial state with their own values.

* Instantly add real-time functionality to keep clients in sync with each other.

* Instantly add or remove any number of data sources (databases, API, sockets, etc.).


If this is new to you, see Wikipedia's [State machine replication](https://en.wikipedia.org/wiki/State_machine_replication) page for more about it!


## Exports

### Default export

- `replicate` - Function which creates and returns the store enhancer based on the `replication` passed to it.  See the [Usage](#usage) section below.

### Utilities

- `storeKeysEqual` - Accepts 2 store keys as arguments and returns true if they match.

### Action types

- `GET_INITIAL_STATE` - Dispatched immediately before calling a replicator's `getInitialState` method.

- `GOT_INITIAL_STATE` - Dispatched after a replicator calls `setState` within its `getInitialState` method.

- `INITIAL_STATE_ERROR` - Dispatched when a replicator calls `setError` within its `getInitialState` method.

- `REPLICATE_INITIAL_STATE` - If using `replication.clientState` or if a replicator passes `undefined` to `setState` within its `getInitialState` method and the store's default initial state should be replicated (via either `replication.create` or `replication.clientState`), this will be dispatched prior to replicating the state (via the replicator's `onStateChange` method).

- `REPLICATED_INITIAL_STATE` - Applicable only in conjunction with `REPLICATE_INITIAL_STATE`.  Dispatched when a replicator calls `setState` or `setStatus` within its `onStateChange` method.

- `REPLICATE_STATE` - Dispatched immediately before calling a replicator's `onStateChange` method.

- `REPLICATED_STATE` - Dispatched when a replicator calls `setState` or `setStatus` within its `onStateChange` method.

- `STATE_CHANGE_ERROR` - Dispatched when a replicator calls `setError` within its `onStateChange` method.

- `SET_STATE` - Used internally when setting the state via `store.setState`, but you can dispatch this action along with `nextState` if for some reason you need to manually override the store's current state.

- `FULLY_INITIALIZED` - Dispatched after replication as fully initialized.


## Usage

Call the `replicate` function (default export) with the following options (as keys within an object) to create a store enhancer.

### key

Typically a string, but this can be anything.  It's passed to your replicators so they know where and/or how to replicate data.  If you're using `reducerKeys`, each `reducerKey` is included in an object with this `key` when calling a replicator's `getInitialState` and `onStateChange` methods.

### reducerKeys

Optional boolean value, array of strings, or object containing boolean values.  This is helpful (and recommended!) if you're using Redux's `combineReducers` function (or similar) and want to replicate changes to individual keys within the store's state object, rather than the entire state tree.

If an array, it will replicate only the keys within the array.

If an object, it will be compared to the `clientState` (see below).  All keys within the object will be replicated, but only the keys with truthy values will be initialized.  This is useful if you want the server to be able to specify a custom initial state while also allowing the client to override the server's initial state.

If `true`, it will replicate all keys.

If either `false` or omitted, it will replicate the entire state object when calling `getInitialState` and `onStateChange` - i.e., it won't iterate over each `reducerKey` even when `combineReducers` is used.

### queryable

Optional boolean value or object used for specifying whether or not the `key` (or `reducerKeys` if used) should be queryable by value.  Defaults to `false`.

If `true` and not using `reducerKeys`, then the `key` will be queryable by value (current state).

If `true` and using `reducerKeys`, then each `reducerKey` will be queryable by value (current state).

An object specifies which `reducerKeys` are queryable by value (current state) where the keys within the object correspond to each `reducerKey` and the values should be truthy.

If `false`, values (current states) will not be queryable.

### create

Set this to `true` to ensure initial states are replicated.

### clientState

Optional object used when determining which `reducerKeys` should be initialized on the client.  This object should be the initial state provided to the client by the server.  If no `clientState`, the client will be able to fully override the initial state with their own replicated values.

### replicator

Either a single replicator or an array of replicators.  See the [Replicators](#replicators) section below.


## Replicators

Replicators can:

* Initialize the state of the store, synchronously and/or asynchronously.

* Save state changes to data sources.

* Allow current states to be queryable.

* Send actions to clients, other servers, etc.

* Be packaged and easily reusable!


A replicator is a plain object of the following shape.

### getInitialState

Optional function to set the store's initial state, synchronously or asynchronously.  The following options are passed to it within an object:

```
Object store,
String reducerKey,
Function setState,
Function setError
```

If using `reducerKeys`, this function is called once per initializable `reducerKey` (passing each `reducerKey` per call).

If not using `reducerKeys`, this function is called only once.

Either the `setState` or the `setError` function must be called for the store to finish initializing, regardless of whether or not the state exists within the data source.

Example (from [`redux-replicate-localforage`](https://github.com/loggur/redux-replicate-localforage)):

```js
const getItemKey = (key, reducerKey) => reducerKey
  ? `${key}/${reducerKey}`
  : key;

const getInitialState = ({ store, reducerKey, setState, setError }) => {
  localforage
    .getItem(getItemKey(store.key, reducerKey))
    .then(state => setState(parse(state)))
    .catch(setError);
};
```

### onReady

Optional function called after initialization.  The following options are passed to it within an object:

```
Object store
```

Example:

```js
import { storeKeysEqual } from 'redux-replicate';

const onReady = ({ store }) => socket.on('action', ({ key, action }) => {
  if (storeKeysEqual(key, store.key)) {
    store.dispatch(action);
  }
});
```

### onStateChange

Optional function to replicate the state and/or the action upon state changes.  The following options are passed to it within an object:

```
Object store,
String reducerKey,
Mixed state,
Mixed nextState,
Boolean queryable,
Object action,
Mixed clientState,
Mixed create,
Function setState,
Function setStatus,
Function setError
```

If using `reducerKeys`, this function is called once per `reducerKey` with `state`, `nextState`, and `queryable` representing each particular `reducerKey`.

If not using `reducerKeys`, this function is called only once.

You should always call either `create` (if it's a function), `setState`, `setStatus`, or `setError` when the replication has completed.

Example (from [`redux-replicate-localforage`](https://github.com/loggur/redux-replicate-localforage)):

```js
const onStateChange = ({
  store,
  reducerKey,
  nextState,
  queryable,
  setStatus,
  setError
}) => {
  localforage
    .setItem(getItemKey(store.key, reducerKey), stringify(nextState))
    .then(() => setStatus())
    .catch(setError);

  if (queryable) {
    // in the case of simple key-value stores like localforage where the
    // ability to query by value doesn't come with it, you can store a
    // custom map of values to keys to be used for querying...
    // in most cases you won't have to implement this functionality though :)
  }
};
```

### postReduction

Optional function to replicate the state and/or the action upon any reduction, regardless of whether or not the store's state has changed.  This is called only after initialization.  If you want to replicate actions, this is the place to do it.  The following options are passed to it within an object:

```
Object store,
Mixed state,
Mixed nextState,
Object action
```

This function is only called once per reduction.  A quick `state !== nextState` check here would let you know if any change has taken place, regardless of whether or not you're using `reducerKeys`.

Example:

```js
function postReduction({ store, state, nextState, action }) {
  if (state !== nextState) {
    socket.emit('action', { key: store.key, action });
  }
}
```

### handleQuery

Optional function to handle some query.  The `query` argument can be specific to your implementation, but it's best to follow convention.  In the future, we may solidify a standard for this.  The following options are passed to it within an object:

```
Object store,
Mixed query,
Mixed options,
Function setResult,
Function setError
```

If using `reducerKeys`, the `query` argument should typically be an object containing `reducerKey` to state (value) pairs.

If not using `reducerKeys`, the `query` argument should typically be the entire state.

These are just general guidelines though, as it all really comes down to how your particular database or API is designed to handle queries.

Example:

```js
function handleQuery({ query, options, setResult, setError }) {
  database
    .find(query, options)
    .then(setResult)
    .catch(setError);
}
```


## Store modifications

The enhancer adds the following to the `store` object.

### store.key

The current `key`.

### store.setKey

(String key, Function readyCallback)

Sets the current `key`.  The `readyCallback` is called after all of the replicators have fully initialized based on the new `key`.

### store.setState

(Mixed nextState)

You typically shouldn't need to use this, as state changes should almost always occur as a result of `store.dispatch(action)`.  But it may be useful for keeping a store's state synchronized with some data source which doesn't rely on actions.  If using `reducerKeys`, the `nextState` is expected to be an object and is merged into the current state, similar to React's `setState`.  If not using `reducerKeys`, the `nextState` replaces the current state entirely.

### store.replication

An array containing each `replication` object (options) passed to the `replicate` function (this package's default export).  In most cases, this will contain only a single `replication` object, but it's mostly used internally for cases where multiple `replicate` enhancers are applied.

### store.onReady

(Function readyCallback)

You can use this if you know your replicator(s) asynchronously initialize the store's state and would like to do something immediately after initialization.  The `readyCallback` will receive the `store` within an object.

### store.readyCallbacks

Used internally for holding each `readyCallback` passed to `store.onReady`.

### store.initializedReplication

If for some reason you need to know whether or not `getInitialState` has completed, you can check this boolean property.  It will be `true` after initialization.


## Example replicator

See [`redux-replicate-fs`](https://github.com/loggur/redux-replicate-fs), a replicator that persists the state of your store(s) and handles queries using Node's file system API.


## Example using [`react-redux-provide`](https://github.com/loggur/react-redux-provide)

Replication and providers work great together!  Providers help you fully reap the benefits of replication.  Below you can see how, with just a few lines of code, we enable real-time chat functionality and replicate the states of entries and comments to RethinkDB.

```js
// src/replication.js

import rethink from 'redux-replicate-rethink';
import socket from 'redux-replicate-socket';
import * as providers from './providers/index';

// replication `key` defaults to each provider instance's key,
// which may be a function of props and context

providers.entry.replication = {
  reducerKeys: ['time', 'author', 'entry', 'tags'],
  replicator: rethink
};

providers.comment.replication = {
  reducerKeys: ['time', 'author', 'comment', 'for'],
  replicator: rethink
};

providers.message.replication = {
  reducerKeys: ['time', 'author', 'message'],
  replicator: socket
};
```


## Example using `compose`

```js
import { createStore, combineReducers, compose } from 'redux';
import replicate from 'redux-replicate';
import localforage from 'redux-replicate-localforage';
import reducers from './reducers';

const initialState = {
  wow: 'such storage',
  very: 'cool'
};

const key = 'superCoolStorageUnit';
const reducerKeys = true;
const replicator = localforage;
const replication = replicate({ key, reducerKeys, replicator });
const create = compose(replication)(createStore);
const store = create(combineReducers(reducers), initialState);
```
