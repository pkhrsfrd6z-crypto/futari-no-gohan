export default {
 async fetch(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "*";
  const cors = {
   "Access-Control-Allow-Origin": allowed === "*" || origin === allowed ? allowed : "null",
   "Access-Control-Allow-Methods": "POST, OPTIONS",
   "Access-Control-Allow-Headers": "Content-Type, X-Pitchlog-Key",
   "Content-Type": "application/json",
   "Cache-Control": "no-store"
  };
  const reply = (data, status=200) => new Response(JSON.stringify(data), {status, headers:cors});
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  if (allowed !== "*" && origin !== allowed) return reply({error:"Origin not allowed"},403);
  if (request.method !== "POST") return reply({error:"POST required"},405);
  if (!env.OPENAI_API_KEY || !env.PITCHLOG_KEY) return reply({error:"Server secrets are not configured"},503);
  if (request.headers.get("X-Pitchlog-Key") !== env.PITCHLOG_KEY) return reply({error:"Invalid app key"},401);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 12000000) return reply({error:"Request too large"},413);
  let body;
  try { body = await request.json(); } catch { return reply({error:"Invalid JSON"},400); }
  if (!Array.isArray(body.frames) || body.frames.length < 1 || body.frames.length > 6) return reply({error:"Send 1 to 6 frames"},400);
  const parts = [{type:"input_text",text:"あなたは育成年代のサッカー分析コーチです。以下は試合動画から抽出した静止画です。静止画だけでは連続した動きやプレー結果は断定できません。見える事実と推測を分け、確認できないことは不明と書き、時間や統計を捏造しないでください。日本語で「確認できること」「良かった点」「改善の候補」「判断できないこと」「次の練習3つ」に分けて分析してください。ポジション："+String(body.position||"不明").slice(0,80)+"。対象："+String(body.period||"全体").slice(0,80)+"。重点："+String(body.focus||"全体").slice(0,160)+"。状況："+String(body.context||"なし").slice(0,800)}];
  for (const f of body.frames) {
   if (typeof f.jpegDataUrl !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.jpegDataUrl) || f.jpegDataUrl.length > 2500000) return reply({error:"Invalid frame"},400);
   parts.push({type:"input_text",text:"抽出時刻（秒）: "+Math.max(0,Number(f.timeSeconds)||0)});
   parts.push({type:"input_image",image_url:f.jpegDataUrl,detail:"low"});
  }
  let upstream;
  try {
   upstream = await fetch("https://api.openai.com/v1/responses", {
   method:"POST",
   headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",store:false,input:[{role:"user",content:parts}],max_output_tokens:1600})
   });
  } catch {
   return reply({error:"Could not reach the AI provider. Try again later."},502);
  }
  const result = await upstream.json().catch(()=>({}));
  if (!upstream.ok) return reply({error:"AI provider error "+upstream.status},502);
  if (typeof result.output_text !== "string" || !result.output_text.trim()) return reply({error:"No analysis returned"},502);
  return reply({analysis:result.output_text.trim(),framesAnalyzed:body.frames.length});
 }
};