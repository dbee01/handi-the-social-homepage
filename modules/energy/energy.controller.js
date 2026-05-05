export default class{
constructor(m,v){this.m=m;this.v=v}
async init(){this.update();setInterval(()=>this.update(),60000)}
async update(){
const d=await this.m.fetch();
const demand=d.Rows.find(r=>r.Name==="Demand")?.Value;
const wind=d.Rows.find(r=>r.Name==="Wind")?.Value;
const renewable=Math.round((wind/demand)*100);
this.v.render({demand,wind,renewable});
const carbon=Math.round(400-renewable*3);
const msg=renewable>60?"Low 🟢":renewable>30?"Mid 🟡":"High 🔴";
this.v.carbon(carbon,msg);
}}