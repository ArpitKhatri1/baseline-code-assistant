(async () => {
  const { getStatus } = await import("compute-baseline");

  const status = getStatus("css","css.properties.backdrop-filter");
  console.log(status);
})();
