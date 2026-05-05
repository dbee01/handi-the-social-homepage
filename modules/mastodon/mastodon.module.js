import M from "./mastodon.model.js";import V from "./mastodon.view.js";import C from "./mastodon.controller.js";
export default c=>new C(new M(),new V(c)).init();