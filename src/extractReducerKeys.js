export default function extractReducerKeys(replication, state) {
  const { clientState } = replication;
  let { reducerKeys } = replication;
  let getReducerKeys = reducerKeys;
  let setReducerKeys = null;

  if (reducerKeys === true) {
    reducerKeys = Object.keys(state);
    getReducerKeys = reducerKeys;
  }

  // here we want the client to get only the undefined initial states
  if (clientState) {
    getReducerKeys = [];
    setReducerKeys = [];

    if (Array.isArray(reducerKeys)) {
      for (let reducerKey of reducerKeys) {
        if (typeof clientState[reducerKey] === 'undefined') {
          getReducerKeys.push(reducerKey);
        } else {
          setReducerKeys.push(reducerKey);
        }
      }
    } else {
      // if reducerKeys is an object, truthy values indicate keys that
      // can be overridden by the client
      for (let reducerKey in reducerKeys) {
        if (
          reducerKeys[reducerKey]
          && typeof clientState[reducerKey] === 'undefined'
        ) {
          getReducerKeys.push(reducerKey);
        } else {
          setReducerKeys.push(reducerKey);
        }
      }

      reducerKeys = Object.keys(reducerKeys);
    }
  }

  replication.reducerKeys = reducerKeys;

  return { getReducerKeys, setReducerKeys };
}
