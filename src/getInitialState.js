import extractReducerKeys from './extractReducerKeys';
import storeKeysEqual from './storeKeysEqual';
import {
  GET_INITIAL_STATE,
  GOT_INITIAL_STATE,
  INITIAL_STATE_ERROR,
  REPLICATE_INITIAL_STATE,
  REPLICATED_INITIAL_STATE,
  STATE_CHANGE_ERROR,
  FULLY_INITIALIZED
} from './actionTypes';

const getInitialState = (store, replication) => {
  const replicators = [].concat(replication.replicator);
  const initReplicators = replicators.filter(replicator => {
    if (replicator.onReady) {
      store.onReady(replicator.onReady);
    }
    // just the replicators with `getInitialState`
    return typeof replicator.getInitialState === 'function';
  });

  // need this for multiple replication enhancers
  store.initializingReplication = (store.initializingReplication || 0) + 1;
  store.initializedReplication = false;

  let waitCount = 1;
  let setInitialState = false;
  let actualInitialState = replication.reducerKeys ? {} : null;
  const clear = () => {
    if (--waitCount === 0) {
      if (setInitialState) {
        store.setState(actualInitialState, true);
      }

      if (--store.initializingReplication === 0) {
        // all replication enhancers initialized, so we can clear all callbacks
        while (store.readyCallbacks.length) {
          store.readyCallbacks.shift()({ store });
        }
        store.initializedReplication = true;
        // these are only used during initialization
        delete replication.create;
        delete replication.clientState;
        delete replication.creatorStore;
        store.dispatch({ type: FULLY_INITIALIZED });
      }
    }
  };

  if (!store.key) {
    clear();
    return;
  }

  const { key } = store;
  const currentState = store.getState();

  const shouldReplicate = reducerKey => replication.create || (
    replication.clientState && (
      !reducerKey || typeof replication.clientState[reducerKey] !== 'undefined'
    )
  );

  const initState = ({ getInitialState, onStateChange }) => reducerKey => {
    const initProps = {
      reducerKey,
      nextState: reducerKey ? currentState[reducerKey] : currentState,
      queryable: typeof replication.queryable === 'object'
        ? replication.queryable[reducerKey]
        : replication.queryable,
      create: replication.create,
      clientState: reducerKey
        ? replication.clientState && replication.clientState[reducerKey]
        : replication.clientState
    };

    store.dispatch({ type: GET_INITIAL_STATE, ...initProps });
    waitCount++;

    getInitialState({
      store,
      reducerKey,
      setState: state => {
        if (typeof state === 'undefined') {
          if (onStateChange && shouldReplicate(reducerKey)) {
            const action = { type: REPLICATE_INITIAL_STATE, ...initProps };

            store.dispatch(action);
            waitCount++;

            onStateChange({
              ...initProps,
              store,
              action,
              setState: state => {
                store.setState(state, true);
                store.dispatch({
                  type: REPLICATED_INITIAL_STATE, ...initProps, state
                });
                clear();
              },
              setStatus: status => {
                store.dispatch({
                  type: REPLICATED_INITIAL_STATE, ...initProps, status
                });
                clear();
              },
              setError: error => {
                store.dispatch({
                  type: STATE_CHANGE_ERROR, ...initProps, error
                });
                clear();
              }
            });
          }
        } else if (storeKeysEqual(key, store.key)) {
          if (reducerKey) {
            actualInitialState[reducerKey] = state;
          } else {
            actualInitialState = state;
          }
          setInitialState = true;
        }

        store.dispatch({ type: GOT_INITIAL_STATE, ...initProps, state });
        clear();
      },
      setError: error => {
        store.dispatch({ type: INITIAL_STATE_ERROR, ...initProps, error });
        clear();
      }
    });
  };

  if (replication.reducerKeys) {
    const { getReducerKeys, setReducerKeys } = extractReducerKeys(
      replication,
      currentState
    );

    if (setReducerKeys) {
      for (let replicator of replicators) {
        if (replicator.onStateChange) {
          for (let reducerKey of setReducerKeys) {
            if (shouldReplicate(reducerKey)) {
              let setProps = {
                reducerKey,
                nextState: reducerKey
                  ? currentState[reducerKey]
                  : currentState,
                queryable: typeof replication.queryable === 'object'
                  ? replication.queryable[reducerKey]
                  : replication.queryable,
                create: replication.create,
                clientState: reducerKey
                  ? replication.clientState
                    && replication.clientState[reducerKey]
                  : replication.clientState
              };

              const action = { type: REPLICATE_INITIAL_STATE, ...setProps };

              store.dispatch(action);
              waitCount++;

              replicator.onStateChange({
                ...setProps,
                store,
                action,
                setState: state => {
                  store.setState(state, true);
                  store.dispatch({
                    type: REPLICATED_INITIAL_STATE, ...setProps, state
                  });
                  clear();
                },
                setStatus: status => {
                  store.dispatch({
                    type: REPLICATED_INITIAL_STATE, ...setProps, status
                  });
                  clear();
                },
                setError: error => {
                  store.dispatch({
                    type: STATE_CHANGE_ERROR, ...setProps, error
                  });
                  clear();
                }
              });
            }
          }
        }
      }
    }

    for (let replicator of initReplicators) {
      let initReducerState = initState(replicator);

      for (let reducerKey of getReducerKeys) {
        initReducerState(reducerKey);
      }
    }
  } else {
    for (let replicator of initReplicators) {
      initState(replicator)();
    }
  }

  clear();
};

export default getInitialState;
