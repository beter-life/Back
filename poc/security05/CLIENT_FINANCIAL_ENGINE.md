# Security05 — motor financeiro do cliente

Proposta documental sob políticas P2–P6 aprovadas, sem aprovação técnica do motor/protocolos; nenhuma implementação ou paridade executada. Fonte das regras: [matriz](FINANCIAL_PARITY_MATRIX.md), com prioridade às regras financeiras efetivamente recuperadas e identificação das lacunas. P3 exige cliente instalado, assinado e verificável com distribuição independente para plaintext; portar o motor para o frontend web atual não cumpre automaticamente essa exigência.

## Entrada, execução e saída

Entrada conceitual: histórico integral autorizado para o escopo, estado de dispositivos/épocas, versões de regras e moeda, timezone e cutoff explícitos, referências de completude/atualidade. Eventos cifrados são verificados e descriptografados no cliente. Não confiar em `verified=true`, total SQL, view/RPC ou saldo fornecido pelo servidor.

Pipeline proposto: validar bytes e versão suportada → autenticar contexto e dispositivo → verificar dependências/estado → validar semântica → aplicar comando lógico atomicamente ao estado local → derivar projeções → marcar o resultado com referência/cutoff e grau de atualidade. Inconsistência impede confirmação e headline atual. Paginação ou cache não pode transformar um prefixo incompleto em saldo completo.

O motor deve ser determinístico para entradas, relógio lógico/cutoff, versões de catálogo, calendário e regras iguais. Relógio de parede local não prova atualidade remota. Alterações de regra exigem versionamento explícito, vetores de compatibilidade e política de rejeição de versões desconhecidas, sem reinterpretação silenciosa de eventos antigos.

## Invariantes a preservar

- Money usa minor units inteiros e expoente por moeda; JSON interno autenticado pode usar string inteira canônica. Sem float monetário, FX implícito ou hipótese global de duas casas. O intervalo individual do baseline é simétrico a BIGINT; agregados podem excedê-lo e precisam de inteiros exatos e limites de recursos explícitos.
- Saldos derivam de abertura e movimentos válidos até cutoff, por moeda, ignorando cancelamentos conforme regra. Transferência é um único bundle, sem dupla contabilização, metade confirmada ou despesa/receita inventada.
- Comando financeiro precisa de semântica válida além de assinatura. Conta, moeda, tipo, owner, categoria, status, referência, época e regra aplicável são conferidos pelo cliente.
- Idempotência financeira compara comando e conteúdo canônico; retry não duplica efeitos. Mesma identidade com conteúdo divergente é conflito. Idempotência de bytes no servidor não substitui isso: nova cifragem do mesmo comando pode ter bytes diferentes.
- Correção e cancelamento preservam a proveniência. Sem assinatura retroativa de intenção passada, setter de saldo ou exclusão silenciosa para fazer um teste passar.
- Datas civis de recorrência são distintas de instantes; respeitar DST, timezone do perfil, timezone snapshot de orçamento, intervalos e cutoff. Regras de parsing têm rejeição de ambiguidade própria, não substituída pelo fallback de apresentação.

## Projeções e concorrência

Uma projeção tem escopo, conjunto de dependências, versão do motor e âncora de estado. Orçamento, metas, patrimônio, rendimentos, cartões, dívidas e Safe to Spend devem usar projeções consistentes do mesmo histórico aplicável, não caches de versões incompatíveis. Falta de taxa externa não permite inventar rendimento; dados públicos de mercado podem ser recebidos sem enviar saldos privados e exigem proveniência/estado CURRENT/STALE/UNAVAILABLE.

Dois dispositivos podem assinar comandos individualmente válidos sobre o mesmo estado e violar um limite em conjunto. CRDT genérico ou ordenação por timestamp não resolve invariantes financeiros. O protocolo deverá serializar ou detectar conflito de estado-base e exigir revalidação determinística após sincronização. P3/P5 já aprovam o objetivo de integridade/fail-closed, mas a finalização normativa continua NOT_PROVEN, inclusive a insuficiência de aceitar quaisquer duas assinaturas entre três (Q23). Sem resolver essa obrigação, confirmação de comandos dependentes fica BLOCKED. Uma intenção offline não é lançamento confirmado. Ver [SYNC_AND_INTEGRITY.md](SYNC_AND_INTEGRITY.md).

## Ingestão e reconciliação

Parsing, mapping, warnings de duplicidade, normalização, preview, confirmação de Inbox e matching financeiro devem ocorrer no cliente confiável instalado/verificável. Nenhum arquivo/preview/valor legível é enviado a parser servidor ou IA. Preservar seleção explícita, INCOME/EXPENSE suportados, rejeição de semântica desconhecida, limites de recursos e confirmação separada. Portar os workers Node para navegador/cliente instalado não é compatibilidade demonstrada. Open Finance, importações ou IA que dependam de plaintext em servidor/terceiro incompatível ficam BLOCKED até arquitetura compatível e aprovação específica; expectativas de UX semelhantes ao Pierre não revelam nem autorizam copiar seus mecanismos internos.

Inbox PENDING/DISCARDED não muda ledger. Confirmar um candidato gera exatamente um efeito lógico com vínculo ao candidato na mesma aceitação atômica; recuperar resposta perdida devolve a referência original. Hint duplicado não é reconciliação nem proibição de compra repetida. Imports criam propostas e receipts, nunca postam automaticamente. Reconciliação liga evidência e movimento e nunca escreve no ledger; reversão não pode desfazer uma associação posterior.

## Plano de paridade

Comparar vetores independentes com regras e dados sintéticos iguais, com resultados esperados revisados fora do novo motor. O backend antigo pode ser referência diferencial limitada, sem se tornar único oráculo nem receber dados reais. Reproduzir bugs antigos não prova regra correta. Casos: overflow em agregados, moedas 0/2/3 casas, DST/cutoff, replay concorrente, cancelamentos, limites removidos, atomicidade e consumidores que ocultam gastos. Todos os testes futuros são NOT_RUN neste gate.
