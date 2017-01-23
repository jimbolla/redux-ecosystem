import * as actionTypes from './actionTypes';

const {
  REPLICATE_STATE,
  REPLICATED_STATE,
  STATE_CHANGE_ERROR
} = actionTypes;

const actionTypeValueMap = {};
for (let key in actionTypes) {
  actionTypeValueMap[actionTypes[key]] = true;
}

const performReplication = (store, replication, state, nextState, action) => {
  if (replication.creatorStore && actionTypeValueMap[action.type]) {
    // TODO: we need a better way to create + replicate
    replication.creatorStore.dispatch(action);
  }

  if (!store || !store.key || !store.initializedReplication) {
    return;
  }

  const replicators = [].concat(replication.replicator);

  for (let replicator of replicators) {
    if (replicator.onStateChange) {
      if (replication.reducerKeys) {
        for (let reducerKey of replication.reducerKeys) {
          if (state[reducerKey] !== nextState[reducerKey]) {
            let setProps = {
              reducerKey,
              state: state[reducerKey],
              nextState: nextState[reducerKey],
              queryable: typeof replication.queryable === 'object'
                ? replication.queryable[reducerKey]
                : replication.queryable
            };

            setTimeout(() => {
              // not liking this at all, but it should be ok given that
              // 99.9999% of data sources are async anyway
              store.dispatch({ type: REPLICATE_STATE, ...setProps });
            });

            replicator.onStateChange({
              ...setProps,
              store,
              action,
              setState: state => setTimeout(() => {
                store.setState(state, true);
                store.dispatch({
                  type: REPLICATED_STATE, ...setProps, state
                });
              }),
              setStatus: status => setTimeout(() => store.dispatch({
                type: REPLICATED_STATE, ...setProps, status
              })),
              setError: error => setTimeout(() => store.dispatch({
                type: STATE_CHANGE_ERROR, ...setProps, error
              }))
            });
          }
        }
      } else if (state !== nextState) {
        let setProps = {
          state,
          nextState,
          queryable: replication.queryable
        };

        setTimeout(() => {
          // not liking this at all, but it should be ok given that
          // 99.9999% of data sources are async anyway
          store.dispatch({ type: REPLICATE_STATE, ...setProps });
        });

        replicator.onStateChange({
          ...setProps,
          store,
          action,
          setState: state => setTimeout(() => {
            store.setState(state, true);
            store.dispatch({
              type: REPLICATED_STATE, ...setProps, state
            });
          }),
          setStatus: status => setTimeout(() => store.dispatch({
            type: REPLICATED_STATE, ...setProps, status
          })),
          setError: error => setTimeout(() => store.dispatch({
            type: STATE_CHANGE_ERROR, ...setProps, error
          }))
        });
      }
    }

    if (replicator.postReduction) {
      replicator.postReduction({ store, state, nextState, action });
    }
  }
};

export default performReplication;
