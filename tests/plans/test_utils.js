
function tube(funcs) {
  const values = [];
  if (!Array.isArray(funcs)) return Promise.resolve(values);

  funcs.push(Promise.resolve());

  return funcs.reduce((prev, curr) => {
    return prev
    .then(v => {
      logger.debug("v => %j", v);
      values.push(v);

      if (typeof curr.then === 'function') return curr;
      if (Array.isArray(curr)) return Promise.all(funcs);

      throw new Error('invalid promise functions!');
    })
    .catch(err => {
      logger.debug("err => %j", err.message);
      // values.push(err);

      if (typeof curr.then === 'function') return curr;
      if (Array.isArray(curr)) return Promise.all(funcs);
    });
  }, Promise.resolve())
  .then(() => values.slice(1));

}

tube([
  blockHandler.writeBlock(block.blockNumber, block.blockInfo),
  blockHandler.writeBlock(block.blockNumber, block.blockInfo),
  blockHandler.updateBlockStatus(block.blockNumber, "finished"),
  blockHandler.readBlock(block.blockNumber),
])
.then(lalala => {
  logger.debug("%j", lalala);
});

