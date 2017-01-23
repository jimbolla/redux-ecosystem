import getInitialState from './getInitialState';
import performReplication from './performReplication';
import storeKeysEqual from './storeKeysEqual';
import {
  GET_INITIAL_STATE,
  GOT_INITIAL_STATE,
  INITIAL_STATE_ERROR,
  REPLICATE_INITIAL_STATE,
  REPLICATED_INITIAL_STATE,
  REPLICATE_STATE,
  REPLICATED_STATE,
  STATE_CHANGE_ERROR,
  SET_STATE,
  FULLY_INITIALIZED
} from './actionTypes';

/**
 * Creates a Redux store enhancer designed to replicate actions and states.
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */
const replicate = replication => next => (reducer, initialState, enhancer) => {
  let store = null;

  replication = { ...replication };

  const replicatedReducer = (state, action) => {
    let nextState = state;

    if (action.type === SET_STATE && !action.mergedState) {
      if (replication.reducerKeys) {
        nextState = { ...state, ...action.nextState };
      } else {
        nextState = action.nextState;
      }

      // if replication applied multiple times, ensure merge occurs only once
      action.mergedState = true;
    }

    nextState = reducer(nextState, action);

    if (!action._skipReplication) {
      performReplication(store, replication, state, nextState, action);
    }

    return nextState;
  };

  store = next(replicatedReducer, initialState, enhancer);

  if (!store.replication) {
    store.replication = [];
  }
  store.replication.push(replication);

  if (!store.onReady) {
    store.readyCallbacks = [];
    store.onReady = readyCallback => store.readyCallbacks.push(readyCallback);
  }

  if (typeof replication.key !== 'undefined') {
    store.key = replication.key;
  }

  if (!store.setKey) {
    store.setKey = (key, readyCallback) => {
      store.key = key;

      if (readyCallback) {
        store.onReady(readyCallback);
      }

      store.replication.forEach(replication => {
        getInitialState(store, replication);
      });
    };
  }

  if (!store.setState) {
    store.setState = (nextState, _skipReplication) => {
      store.dispatch({ type: SET_STATE, nextState, _skipReplication });
    };
  }

  getInitialState(store, replication);
  return store;
};

export default replicate;

export {
  replicate,
  storeKeysEqual,
  GET_INITIAL_STATE,
  GOT_INITIAL_STATE,
  INITIAL_STATE_ERROR,
  REPLICATE_INITIAL_STATE,
  REPLICATED_INITIAL_STATE,
  REPLICATE_STATE,
  REPLICATED_STATE,
  STATE_CHANGE_ERROR,
  SET_STATE,
  FULLY_INITIALIZED
};
