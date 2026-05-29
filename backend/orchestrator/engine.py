import asyncio
import json
from typing import Dict, Any, AsyncGenerator
from .assessor import assess_question, Complexity


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

AGENT_PROMPTS = {
    "sophie":    "Tu es Sophie, CPA fiscaliste quebecoise (T1/T2, TPS/TVQ, RS&DE, CRA). Reponds en 300 tokens max, bullet points, faits cles.",
    "alexandre": "Tu es Alexandre, CPA audit et controle interne. Reponds en 300 tokens max, bullet points, risques prioritaires.",
    "natalie":   "Tu es Natalie, specialiste tresorerie et cashflow. Reponds en 300 tokens max, bullet points, chiffres concrets.",
    "sarah":     "Tu es Sarah, experte valorisation DCF et M&A. Reponds en 300 tokens max, bullet points, hypotheses cles.",
    "marc":      "Tu es Marc, expert ESG et developpement durable. Reponds en 300 tokens max, bullet points, impacts materiels.",
    "isabelle":  "Tu es Isabelle, experte conformite Loi 25 et donnees personnelles. Reponds en 300 tokens max, bullet points, obligations legales.",
    "thomas":    "Tu es Thomas, stratege en croissance et positionnement. Reponds en 300 tokens max, bullet points, recommandations concretes.",
    "elena":     "Tu es Elena, experte operations internationales et forex. Reponds en 300 tokens max, bullet points, risques et opportunites.",
}


async def call_agent(agent: str, question: str, context: Dict) -> str:
    import httpx
    import os
    api_key = context.get("api_key") or os.getenv("OPENROUTER_API_KEY", "")
    system = AGENT_PROMPTS.get(agent, "Tu es un expert financier.")
    extra = ""
    for key, val in context.items():
        if key.endswith("_result") and val:
            extra += f"\n\nContexte {key.replace('_result', '')} : {str(val)[:400]}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}", "HTTP-Referer": "https://cfo.optigenius.pro", "X-Title": "Z12 AI CFO Suite"},
                json={"model": "deepseek/deepseek-v4-pro", "max_tokens": 450,
                      "messages": [{"role": "system", "content": system}, {"role": "user", "content": question + extra}]},
            )
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Erreur agent {agent}: {str(e)[:100]}]"


async def run_named_agent(name: str, question: str, context: Dict):
    result = await call_agent(name, question, context)
    return name, result


async def synthesize(question: str, results: Dict[str, str]) -> str:
    import httpx
    import os
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    agents_block = "\n\n".join([f"### {a.capitalize()}\n{c}" for a, c in results.items()])
    prompt = f"""Tu es l orchestrateur du cabinet Z12 AI CFO Suite.
Question : {question}
Analyses recues :
{agents_block}
Synthetise en rapport unifie : 1. Conclusions cles (3-5 pts) 2. Convergences experts 3. Divergences/tensions 4. Recommandation principale. Max 500 tokens, ton professionnel."""
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}", "HTTP-Referer": "https://cfo.optigenius.pro", "X-Title": "Z12 AI CFO Suite"},
                json={"model": "deepseek/deepseek-v4-pro", "max_tokens": 600,
                      "messages": [{"role": "user", "content": prompt}]},
            )
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Erreur synthese: {str(e)[:100]}]"


async def execute_orchestration(question: str, context: Dict[str, Any]) -> AsyncGenerator[str, None]:
    assessment = await assess_question(question)
    yield f"data: {json.dumps({'type': 'assessment', 'complexity': assessment.complexity.value, 'agents': assessment.agents, 'reasoning': assessment.reasoning})}\n\n"
    results: Dict[str, str] = {}
    if assessment.complexity.value == "simple":
        agent = assessment.agents[0]
        yield f"data: {json.dumps({'type': 'agent_start', 'agent': agent})}\n\n"
        result = await call_agent(agent, question, context)
        results[agent] = result
        yield f"data: {json.dumps({'type': 'agent_result', 'agent': agent, 'content': result})}\n\n"
    else:
        if assessment.parallel_group:
            tasks = [run_named_agent(a, question, context) for a in assessment.parallel_group]
            for a in assessment.parallel_group:
                yield f"data: {json.dumps({'type': 'agent_start', 'agent': a})}\n\n"
            for coro in asyncio.as_completed(tasks):
                name, result = await coro
                results[name] = result
                yield f"data: {json.dumps({'type': 'agent_result', 'agent': name, 'content': result})}\n\n"
        for (agent, depends_on) in assessment.sequential_chain:
            enriched = {**context, f"{depends_on}_result": results.get(depends_on, "")}
            yield f"data: {json.dumps({'type': 'agent_start', 'agent': agent})}\n\n"
            result = await call_agent(agent, question, enriched)
            results[agent] = result
            yield f"data: {json.dumps({'type': 'agent_result', 'agent': agent, 'content': result})}\n\n"
    if len(results) > 1:
        synthesis = await synthesize(question, results)
        yield f"data: {json.dumps({'type': 'synthesis', 'content': synthesis})}\n\n"
    yield "data: [DONE]\n\n"
