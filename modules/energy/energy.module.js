import M from "./energy.model.js";import V from "./energy.view.js";import C from "./energy.controller.js";
export default (g,cv,cm)=>new C(new M(),new V(g,cv,cm)).init();