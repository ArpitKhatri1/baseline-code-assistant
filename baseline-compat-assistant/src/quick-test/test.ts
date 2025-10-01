(async () => {
  const { getStatus, computeBaseline } = await import("compute-baseline");
  const status = computeBaseline({ compatKeys: ["css.pseudo-elements.marker"] });

  console.log(status.toJSON());
})();
