import M from "./weather.model.js";import V from "./weather.view.js";import C from "./weather.controller.js";
export default c=>new C(new M(),new V(c)).init();