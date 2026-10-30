# Política compartilhada da equipe — BL-TEAM-1

Autoridade: CEO, prompt do gate de configuração recebido em 2026-10-29 e instrução para prosseguir com a equipe. Esta cópia e a de ../Back ou ../Front são réplicas da mesma política, não decisões independentes. Revisão: BL-TEAM-1; atualizações somente com gate/autoridade identificados e sincronização explícita dos dois repositórios.

## Fonte e precedência

Decisões explícitas vigentes do CEO prevalecem sobre snapshots históricos. AGENTS.md mantém convenções locais; docs/PROJECT_STATE.md descreve o checkout. Este documento concentra decisões da equipe; TEAM_CHECKPOINT.md guarda somente o estado deste gate, evidências e pendências. Não altera documentos Security nem o estado do produto. O checkpoint da equipe fica em docs/governance/ por restrição explícita deste gate, excepcionando somente aqui a instrução geral de atualizar PROJECT_STATE.md.

Antes de qualquer tarefa: verificar branch/HEAD/status/worktree, política e definições da equipe dos dois repositórios; comparar conteúdo e revisão. Paths irmãos Front/Back foram confirmados fisicamente neste gate, mas devem ser reconfirmados em outro ambiente. Diferença relevante de política, revisão, agentes, escopo aprovado ou decisão não resolvida: BLOCKED, apresentar diferenças e solicitar CEO; nunca escolher silenciosamente uma cópia. Diferenças legítimas do estado de produto devem ser identificadas por repositório e SHA. Se um repositório não puder ser consultado, bloquear trabalho que dependa da política compartilhada.

## Decisões permanentes

- E2EE é a arquitetura-alvo. Valores monetários legíveis no servidor são proibidos; cálculos financeiros no cliente confiável.
- Nunca enviar valores financeiros legíveis, DEKs, chaves privadas ou materiais de recuperação para servidor, logs, métricas ou serviços de IA.
- Security02: reprovado. Security03: parcial, não aprovado. Security04: documental. Security05: redesenho documental proposto, execução não autorizada.
- MDL13 e MDL14: BLOCKED. P1: E2EE. P2–P6: aguardam decisões de produto do CEO.
- Nenhum agente libera bloqueios. Uma violação dessas decisões exige FAIL, mesmo com testes PASS.

## Perguntar e aprovar

Dúvida relevante sobre arquitetura, segurança, permissões, escopo, custo relevante, comportamento financeiro ou perda de dados é bloqueante. Pergunte ao CEO com dúvida concreta, alternativas viáveis, recomendação com evidência e consequências. Aguarde resposta; silêncio não consente. Não inventar requisitos, números, decisões, resultados ou aprovações; confirmar substituições e não ampliar escopo.

Ausência de evidência não aprova. Recomendação não autoriza. Consenso não prova. Desenvolvedor não aprova sua implementação; arquiteto não aprova sua arquitetura; gerente não substitui CEO. Planejamento não libera implementação; documentação não libera PoC, migration ou publicação. Toda aprovação identifica gate e escopo exatos. Revisão técnica independente não equivale à aprovação humana.

## Classificação antes de cada tarefa

O gerente informa ao CEO nível/risco, modelo, esforço, número de agentes e motivo da delegação. Risco prevalece sobre tamanho.

| Nível | Modelo recomendado | Esforço | Delegação |
| --- | --- | --- | --- |
| 0 trivial | GPT-6 Luna (gpt-6-luna) | low/medium | zero |
| 1 rotineiro | GPT-6.1 Sol (gpt-6.1-sol) | medium | zero; exceção justificada |
| 2 complexo | GPT-6.1 Sol | high | máximo dois, somente tarefas independentes |
| 3 crítico: E2EE, recuperação, finanças, migrations, autenticação, irreversibilidade | GPT-6.1 Sol | high; xhigh justificado | revisão independente conforme gate, paralelismo limitado, execução só com autorização específica CEO |

Os modelos/esforços dos TOML são padrões por papel; a classificação da tarefa prevalece. Não trocar silenciosamente modelo indisponível. O catálogo embutido confirma identificadores, não acesso da conta. Não usar vários agentes por disponibilidade. Limite inicial de dois subagentes simultâneos; nunca elevar automaticamente. Evitar leitura/teste/pesquisa repetida sem razão; usar rg, contexto direcionado e evidências pequenas com referências. Não ativar agentes automaticamente neste gate.

## Evidências e continuidade

PASS: critério verificado com evidência adequada; FAIL: critério violado; PARTIAL: parte verificada; NOT_RUN: não executado; NOT_PROVEN: evidência insuficiente; SIMULATED: resultado de simulação, sem aprovação real. BLOCKED é estado de fluxo, não resultado de teste.

Cada checkpoint futuro registra: gate/escopo exatos, autoridade e referência da decisão, repositório/branch/HEAD, mudanças locais, decisões vigentes/substituídas, responsáveis, comandos/resultados/evidências sem segredos, divergências, bloqueios e próximo passo autorizado. Reutilizar fontes existentes; nunca depender apenas da conversa. Histórico de decisões da equipe: adicionar revisão, data, autoridade, escopo, decisão substituída e motivo aqui, sincronizando as duas cópias. Não inventar aprovação ao atualizar documentos.

## Controles e limites

O gate autoriza somente .codex/agents/, configuração Codex local compatível, seções mínimas de AGENTS.md e docs/governance/. Proibidos produto, migrations, documentos Security02–Security05, PoCs, infraestrutura, instalação externa, commit/push/PR/merge/deploy. Encerrar no checkpoint e aguardar CEO.

TOML não garante isolamento entre agentes, proibição de ferramentas ou autorização humana. A sandbox efetiva desta sessão é workspace-write com rede restrita e escalonamento por revisão automática; isso não equivale a aprovação de produto. Permissões herdadas, overrides do host, confiança do projeto e proteções GitHub precisam de verificação própria. Bloqueio técnico de publicação, gates de produto, separação de funções e fiscalização de E2EE: NOT_ENFORCED neste gate. Propor gate posterior de controles, sem implementar CI, hooks ou automações agora. O limite configurado deve ser verificado no runtime consumidor; não alegar que alterou a sessão já aberta.

## Referências

- https://developers.openai.com/codex/subagents (redireciona à documentação oficial ChatGPT Learn; formato e limites).
- https://developers.openai.com/codex/config-reference (configuração e precedência).
- [Referências de design](DESIGN_REFERENCES.md).
- [Checkpoint e evidências](TEAM_CHECKPOINT.md).

## Revisão de escopo — BL-TEAM-1 / instalação 2026-10-29

Autoridade: CEO, "Permissão para instalar skills concedida". Substitui somente a pendência/proibição de instalar as duas skills neste novo gate: autorizada cópia local em .agents/skills/ de Front e Back, com licenças, origem fixada e integração documental. Instalação concluída conforme DESIGN_REFERENCES.md. Não autoriza novas instalações, alterações globais, execução automática de scripts/agentes ou mudanças de produto. Demais decisões, bloqueios e limites BL-TEAM-1 permanecem. Próximo passo: confirmar descoberta no próximo turno sem chamar agentes nem executar fluxos de design automaticamente.

## Revisão de escopo — BL-TEAM-1 / validação e commits locais 2026-10-29

Autoridade: CEO, prompts "Gate final de validação dos agentes" e "Gate de revisão final e commits locais", seguidos de "Autorizo" para corrigir exclusivamente espaços finais e documentar a adaptação, e "prossiga" para concluir. O teste operacional anterior autorizou somente oito execuções sequenciais por agent_type, sem overrides e sem ferramentas; terminou com os oito perfis confirmados no Front pelos registros do runtime. Essa autorização de execução está encerrada.

Este gate autoriza exclusivamente a revisão e um commit local por repositório na branch codex/agent-team-design-skills, condicionados à auditoria e ao diff preparado aprovados. Substitui somente a proibição anterior de commits locais para esse escopo: .codex/config.toml, .codex/agents/, as duas skills locais, acréscimos de governança em AGENTS.md e docs/governance/. A correção autorizada remove espaços finais de 46 linhas de scripts/design_system.py na UI UX Pro Max; o manifesto preserva o hash upstream e registra o hash local. Não autoriza novos subagentes, instalações, configurações globais, alterações de permissões ou fallback de modelos.

Push, PR, merge, deploy, produto, migrations, infraestrutura e novas PoCs permanecem sem autorização. E2EE, cálculos no cliente confiável e proibição de valores monetários legíveis no servidor permanecem obrigatórios. Security02 reprovado; Security03 parcial e não aprovado; Security04 documental; Security05 sem autorização de implementação ou nova PoC; MDL13/MDL14 bloqueados. Commits de governança não aprovam segurança do produto. Após os commits locais, encerrar e aguardar o CEO.
