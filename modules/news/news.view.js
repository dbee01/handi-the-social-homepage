export default class{constructor(c){this.c=c}render(items){this.c.innerHTML="<h3>News</h3>"+items.map(i=>`<p>${i.title}</p>`).join("")}}
