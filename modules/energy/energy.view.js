export default class{
constructor(g,cv,cm){this.g=g;this.cv=cv;this.cm=cm}
render(d){this.g.innerHTML=`<h3>Grid</h3>⚡ ${d.demand}MW<br>🌬️ ${d.wind}MW<br>🌱 ${d.renewable}%`}
carbon(v,m){this.cv.innerText=v;this.cm.innerText=m}
}