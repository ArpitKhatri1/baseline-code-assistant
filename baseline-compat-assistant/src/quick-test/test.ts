// (async () => {
//   const { getStatus, computeBaseline } = await import("compute-baseline");
//   const status = computeBaseline({ compatKeys: ["css.pseudo-elements.marker"] });

//   console.log(status.toJSON());
// })();

import csstree from "css-tree";
const css = "a { color: red; }";
const ast = csstree.parse(css);
console.log(ast);
