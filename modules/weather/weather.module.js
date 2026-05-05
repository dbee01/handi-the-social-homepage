import M from "./weather.model.js";
import V from "./weather.view.js";
import C from "./weather.controller.js";

export default (c) => {
  if (!c) throw new Error("Container is required");
  const controller = new C(new M(), new V(c));
  controller.init();
  return controller;
};
