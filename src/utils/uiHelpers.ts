import { AGENTS_STUDIO } from './agentsConfig';

// ----- Model list (OpenRouter) -----
export const OPENROUTER_MODELS = [
  //  Anthropic 
  { id:"deepseek/deepseek-v4-pro",        label:"Claude Sonnet 4.5",         provider:"Anthropic", tier:"premium",   cost:"$$"   },
  { id:"deepseek/deepseek-v4-pro",        label:"Claude 3.5 Sonnet",         provider:"Anthropic", tier:"premium",   cost:"$$"   },
  { id:"anthropic/claude-3-opus",            label:"Claude 3 Opus",             provider:"Anthropic", tier:"premium",   cost:"$$$$" },
  { id:"anthropic/claude-3-haiku",           label:"Claude 3 Haiku",            provider:"Anthropic", tier:"fast",      cost:"$"    },
  //  OpenAI 
  { id:"openai/gpt-4o",                      label:"GPT-4o",                    provider:"OpenAI",    tier:"premium",   cost:"$$$"  },
  { id:"openai/gpt-4o-mini",                 label:"GPT-4o Mini",               provider:"OpenAI",    tier:"fast",      cost:"$"    },
  { id:"openai/gpt-4-turbo",                 label:"GPT-4 Turbo",               provider:"OpenAI",    tier:"premium",   cost:"$$$"  },
  { id:"openai/o3-mini",                     label:"o3 Mini (Reasoning)",        provider:"OpenAI",    tier:"reasoning", cost:"$$"   },
  { id:"openai/o1",                          label:"o1 (Reasoning)",             provider:"OpenAI",    tier:"reasoning", cost:"$$$$" },
  //  Google 
  { id:"google/gemini-2.5-pro-preview",      label:"Gemini 2.5 Pro",            provider:"Google",    tier:"premium",   cost:"$$"   },
  { id:"google/gemini-2.0-flash-001",        label:"Gemini 2.0 Flash",          provider:"Google",    tier:"fast",      cost:"$"    },
  { id:"google/gemini-2.0-flash-exp:free",   label:"Gemini 2.0 Flash (Free)",   provider:"Google",    tier:"free",      cost:"FREE" },
  { id:"google/gemini-flash-1.5-8b",         label:"Gemini Flash 1.5 8B",       provider:"Google",    tier:"fast",      cost:"$"    },
  //  Meta 
  { id:"meta-llama/llama-3.3-70b-instruct",  label:"Llama 3.3 70B",             provider:"Meta",      tier:"fast",      cost:"$"    },
  { id:"meta-llama/llama-3.1-8b-instruct:free", label:"Llama 3.1 8B (Free)",   provider:"Meta",      tier:"free",      cost:"FREE" },
  //  Mistral 
  { id:"mistralai/mistral-large-2411",       label:"Mistral Large 2411",        provider:"Mistral",   tier:"premium",   cost:"$$"   },
  { id:"mistralai/mistral-small-3.1-24b-instruct:free", label:"Mistral Small 3.1 (Free)", provider:"Mistral", tier:"free", cost:"FREE" },
  //  DeepSeek 
  { id:"deepseek/deepseek-chat-v3-0324",     label:"DeepSeek V3",               provider:"DeepSeek",  tier:"fast",      cost:"$"    },
  { id:"deepseek/deepseek-r1",               label:"DeepSeek R1 (Reasoning)",   provider:"DeepSeek",  tier:"reasoning", cost:"$"    },
  { id:"deepseek/deepseek-r1-zero:free",     label:"DeepSeek R1 Zero (Free)",   provider:"DeepSeek",  tier:"free",      cost:"FREE" },
  //  Cohere 
  { id:"cohere/command-r-plus-08-2024",      label:"Command R+ (Aug 2024)",     provider:"Cohere",    tier:"premium",   cost:"$$"   },
  //  xAI 
  { id:"x-ai/grok-3-beta",                   label:"Grok 3 Beta",               provider:"xAI",       tier:"premium",   cost:"$$$"  },
  { id:"x-ai/grok-2-1212",                   label:"Grok 2",                    provider:"xAI",       tier:"premium",   cost:"$$"   },
  //  Qwen 
  { id:"qwen/qwen-2.5-72b-instruct",         label:"Qwen 2.5 72B",              provider:"Alibaba",   tier:"fast",      cost:"$"    },
  { id:"qwen/qwq-32b:free",                  label:"QwQ 32B Reasoning (Free)",  provider:"Alibaba",   tier:"free",      cost:"FREE" },
];

// ----- Agent lookup helpers -----
export const agentById = (id: string) => AGENTS_STUDIO.find(a => a.id === id) || AGENTS_STUDIO[0];
export const agentName  = (id: string, _lang?: string) => agentById(id).name;
export const agentTitle = (id: string, _lang?: string) => agentById(id).short || '';

// ----- Time formatter -----
export const fmtTime = (iso: string) => { const d=Math.floor((Date.now()-new Date(iso).getTime())/60000); if(d<1)return"é l'instant";if(d<60)return`${d} min`;if(d<1440)return`${Math.floor(d/60)}h`;if(d<2880)return"Hier";return new Date(iso).toLocaleDateString("fr-CA",{day:"numeric",month:"short"}); };
