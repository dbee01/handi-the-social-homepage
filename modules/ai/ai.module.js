export default btn=>{
btn.onclick=async()=>{
try{
const r=await fetch("http://localhost:11434/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"llama3",prompt:"Summarise Irish news"})});
const d=await r.json();alert(d.response);
}catch{alert("No local AI")}}}
