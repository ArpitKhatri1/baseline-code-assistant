(async () => {
  const { getStatus } = await import("compute-baseline");

  const status = getStatus("css","css.selectors.has");
  console.log(status);
})();
