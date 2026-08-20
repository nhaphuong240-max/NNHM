# ADR-005: AI Gateway — NestJS Module Phase 1, FastAPI Sidecar Phase 2

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-005 |
| **Status** | Accepted |
| **Date** | 22/07/2026 |
| **Deciders** | Architecture Team, Tech Lead, AI Lead |
| **Baseline** | WEREAL-BL-2026-002 |
| **Related FR/NFR** | FR-AI-01→04, NFR-P05, NFR-P06, NFR-C04, BR-06, BR-16, CON-06 |
| **Supersedes** | — |
| **Superseded by** | — |

## Context

WEREAL Phase 1 AI scope (Must):

| Capability | FR | Latency target |
|------------|-----|----------------|
| Listing content copilot | FR-AI-01 | P95 ≤ 8s (NFR-P05) |
| Lead scoring | FR-AI-02 | ≤ 3s after capture (NFR-P06) |
| Guardrails — no price/inventory mutation | FR-AI-03 | Block 100% mutate attempts |
| Human-in-the-loop approval | FR-AI-04 | Required before publish |

Phase 2+: RAG (tenant-isolated vector index), Agents, marketplace intelligence.

**Guardrails non-negotiable:** AI **never** mutates price, inventory, or booking state (FR-AI-03).

## Decision

1. **Phase 1:** AI Gateway as **NestJS module** (`M11 ai`) calling external LLM API via provider abstraction
2. **Phase 2+:** Extract **FastAPI sidecar** for RAG/ML workloads (LangChain, vector stores)
3. **Central guardrails** enforced in gateway regardless of runtime (NestJS or FastAPI)

### LLM Provider Abstraction

```typescript
interface LLMProvider {
  complete(params: CompletionParams): Promise<CompletionResult>;
  embed?(text: string): Promise<number[]>;  // P2 RAG
}

// Implementations: OpenAIProvider, AnthropicProvider, GeminiProvider
```

## Rationale

1. **P1 scope nhỏ** — copilot + scoring không cần Python ML stack; NestJS module đủ
2. **Shared auth/tenant** — reuse JWT middleware, RLS context, audit logging
3. **Python ecosystem P2** — RAG/ML tốt hơn với LangChain, LlamaIndex, scikit-learn
4. **Guardrails centralized** — single enforcement point before any LLM call or response return
5. **Provider abstraction day 1** — swap OpenAI/Anthropic/Gemini without API contract change
6. **Cost cap** — per-tenant budget tracking in `ai_action_logs` table (CON-06)

## Consequences

### Positive

- Fast P1 delivery — no extra service deploy
- Guardrails enforced at gateway — block mutate prompts/responses
- AI action audit trail — FR-TR-05 compliance
- Tenant-isolated prompt context — no cross-tenant leak

### Negative

- Node.js not ideal for heavy ML inference P3
- FastAPI sidecar adds network hop + ops complexity P2
- LLM latency variable — need timeout + fallback messaging

### Neutral

- Disclaimer in every AI response: "Nội dung AI — cần agent duyệt" (NFR-C04)

## Guardrails (Non-negotiable)

| Rule | Enforcement |
|------|-------------|
| No price mutation | Block prompts/responses containing price field writes |
| No inventory mutation | Block unit status/booking state changes via AI endpoint |
| No auto-publish | `requiresApproval: true` in all copilot responses |
| Tenant isolation | Prompt context scoped to `tenantId`; separate vector index P2 |
| Cost cap | 20 req/min per tenant; daily token budget CON-06 |

```typescript
// Guardrail middleware pseudocode
if (request.task === 'LISTING_DESCRIPTION') {
  assertNoFields(response, ['basePrice', 'status', 'inventory']);
  response.requiresApproval = true;
  response.disclaimer = 'Nội dung AI — cần agent duyệt trước publish';
}
```

## Phase Migration

| Phase | Architecture | Scope |
|-------|--------------|-------|
| P1 | NestJS AI module | Copilot, lead scoring, guardrails |
| P2 | + FastAPI sidecar | RAG over listing/project docs; vector index per tenant |
| P3 | FastAPI primary for Agents | Multi-step agents; marketplace intelligence |
| P4 | Eval pipeline | A/B testing, model versioning |

**Sidecar communication P2:**

```
NestJS API → HTTP/gRPC → FastAPI AI Sidecar
                       → Vector DB (pgvector / OpenSearch k-NN)
                       → LLM Provider API
```

## Implementation Notes

**Phase 1 endpoints:**

- `POST /ai/copilot/generate` — API-067
- `POST /ai/leads/{leadId}/score` — API-068

**AI action log:**

```sql
CREATE TABLE ai_action_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  action_type VARCHAR(50),  -- COPILOT, LEAD_SCORE
  input_hash VARCHAR(64),
  output_preview TEXT,
  latency_ms INT,
  tokens_used INT,
  guardrail_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Alternatives Rejected

| Alternative | Lý do loại |
|-------------|------------|
| Direct LLM calls from ListingService | No guardrails; no audit; no cost tracking |
| FastAPI from day 1 | Overhead P1; team TS-focused; scope too small |
| Embedded LLM in browser | Security risk; API keys exposed; no guardrails |
| No AI Phase 1 | FR-AI-01→04 are Must requirements |

## References

- SDD §4.6 AI Layer justification
- SDD §12 AI Module Design
- [`Thiet-ke-API.md`](../Thiet-ke-API.md) — API-067, API-068
- [`Mockup-UI-mau.md`](../Mockup-UI-mau.md) — Agent listing wizard with AI copilot
