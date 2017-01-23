const storeKeysEqual = (a, b) => (
  a === b
  || a && a.toString && b && b.toString && a.toString() === b.toString()
);

export default storeKeysEqual;
