export default class{constructor(c){this.c=c}render(p){this.c.innerHTML="<h3>Mastodon</h3>"+p.map(x=>`<p>${x.content}</p>`).join("")
