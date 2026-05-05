import M from "./news.model.js";import V from "./news.view.js";import C from "./news.controller.js";
export default c=>new C(new M(),new V(c)).init();