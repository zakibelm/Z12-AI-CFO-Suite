import json
import httpx
import os
from dataclasses import dataclass
from typing import List
from enum import Enum


class Complexity(str, Enum):
    SIMPLE  = "simple"
    MEDIUM  = "medium"
    COMPLEX = "complex"


AGENTS_AVAILABLE = [
    "sophie", "alexandre", "natalie", "sarah",
    "marc", "isabelle", "thomas", "elena",
]

ASSESSOR_PROMPT = """Tu es l orchestrateur du cabinet financier Z12 AI CFO Suite.
Analyse cette question et retourne UNIQUEMENT un JSON valide (aucun texte autour).
Question : {question}
Agents: sophie (fiscalite/impots/TPS), alexandre (audit/risque), natalie (tresorerie/cashflow), sarah (valorisation/DCF/M&A), marc (ESG), isabelle (Loi25/conformite), thomas (strategie), elena (international/forex)
Retourne JSON: {{"complexity": "simple|medium|complex", "agents": ["agent1"], "reasoning": "texte"}}
Regles: simple=1 agent, medium=2-3 agents, complex=question strategique majeure (acquisition/restructuration/IPO). Max 6 agents."""


@dataclass
class AssessmentResult:
    complexity: Complexity
    agents: List[str]
    parallel_group: List[str]
    sequential_chain: List[tuple]
    reasoning: str


DEPENDENCIES = {
    "marc":     "sarah",
    "isabelle": "alexandre",
}


async def assess_question(question: str) -> AssessmentResult:
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "HTTP-Referer": "https://cfo.optigenius.pro", "X-Title": "Z12 AI CFO Suite"},
                json={"model": "deepseek/deepseek-v4-pro", "max_tokens": 200,
                      "messages": [{"role": "user", "content": ASSESSOR_PROMPT.format(question=question)}]},
            )
        raw = response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[WARN] Assessor error: {e}")
        return AssessmentResult(Complexity.SIMPLE, ["sophie"], ["sophie"], [], "fallback")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(m.group()) if m else {"complexity": "simple", "agents": ["sophie"]}
    agents = [a for a in data.get("agents", ["sophie"]) if a in AGENTS_AVAILABLE] or ["sophie"]
    parallel = [a for a in agents if a not in DEPENDENCIES or DEPENDENCIES[a] not in agents]
    sequential = [(a, DEPENDENCIES[a]) for a in agents if a in DEPENDENCIES and DEPENDENCIES[a] in agents]
    return AssessmentResult(Complexity(data.get("complexity", "simple")), agents, parallel, sequential, data.get("reasoning", ""))
