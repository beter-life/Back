# Security05.2 — fechamento documental dos protocolos

Data:2026-11-04. Estado desta proposta: **REVISION_PENDING_INDEPENDENT_REVIEW**. Teto de encerramento **DOCUMENTATION_REVIEWED_NOT_APPROVED**. Direção executiva aprovada, desenho proposto, desenho efetivamente revisado e segurança demonstrada são camadas distintas; esta rodada ainda não recebeu parecer independente, e segurança continua NOT_PROVEN.

## Autoridade e preservação

Pedido primário vigente: “BETER LIFE — SECURITY05.2 / Fechamento documental dos protocolos de segurança”, anexo Texto colado.txt identificado em SOURCE_PROVENANCE. Autoriza exclusivamente atualizar/revisar documentos existentes em Back/poc/security05. Preservar os13 Markdown modificados não preparados, as4fontes históricas e os17arquivos existentes. Não mudar código/config/políticas/PROJECT_STATE/DB/infra/dependências nem executar PoC/teste experimental/migration/commit/push/merge/deploy. Security06 não autorizado; MDL13/MDL14 bloqueados.

Back permanece codex/security05-protocols@22ee3b0b959832b1293e37eef217d926a40db3e6, commit LOCAL de preservação feito no gate anterior, parent ceea9e7e95527fa8039283135fc477c84c4ad63b. Security05.2 não autoriza novo commit ou reset/checkout/rebase/limpeza. Front permanece codex/agent-team-design-skills@8c8c4f548023aadce4da1aadb0afe2778db0c455 limpo.

## Direção executiva atual

| Requisito | Escolha vigente | Limites de aprovação |
| --- | --- | --- |
| P1/P2 | E2EE e cálculo cliente; conteúdo/vínculos privados cifrados; metadados mínimos inventariados, sem novos índices/exposição financeira implícitos | Proposta técnica não comprova conformidade de produto atual |
| Q23/P3 | Quatro testemunhas independentes, quorum3, HotStuff auditável, até1bizantina junto com backend+SQL+Auth comprometidos |3assinaturas não são protocolo completo; refinamento/restore/pacemaker/handover ainda abertos |
| A1 | Referência independente complementar, comparação/piso/bootstrap | Não serializa, não emite FINAL obrigatório, não ignora consenso; perda/clonagem/ausência total de mínimos ainda têm limites |
| R35/P4 | S aleatório, Shamir3/5, U independente32B aleatórios, HKDF-SHA256 conjunto, AES256GCM roots |U já selecionado, senha humana não substitui; composição/cerimônias/custódia ainda não comprovadas |
| P5 | Sem estado/prova/quorum: sem confirmação/saldo atual/STS válido; só snapshot local verificado/datado e rascunho cifrado não confirmado |Dados incompletos ou cliente não íntegro não ganham confiança por estar offline |
| O36/P6 | Quatro operadores/domínios separados, audit/monitoring/DR/incidentes e sustentabilidade |Fornecedor/VM não comprova independência; total/capacidade/SLA ainda pendentes |
| A3 | Cliente instalado assinado/verificável, distribuição/update independentes do backend |Bootstrap, thresholds/expiração/tempo/estado antirollback e resposta a compromisso precisam de aprovação/prova próprias |

As opções anteriores2-de-3 com A1 serializadora, três domínios e U ainda pendente foram superadas no escopo preciso da nova decisão. Continuam históricas no Git/revisões, não como fallback operacional. Relatos Security02–04 permanecem secundários pelo handoff, originais técnicos ausentes/NOT_PROVEN; fontes financeiras originais recuperadas não provam implantação ou paridade atuais.

## Especificação refinada e problemas materiais

Q23 fixa documentalmente **Basic HotStuffv6 Algorithm1/2 e §4.4**, com QC tipada, descendênciaF02 E safeNode, fases/locks, pacemaker simples publicado e persist-before-send. SYNC separa núcleo publicado das adaptações de disco/catch-up/read barrier e **FREEZE–INSTALL–ACTIVATE**. Reiniciar com log íntegro é distinto de restaurar último decide sem votos/locks pendentes; nó sem estado suficiente não vota.

Q-RECONFIG inclui um contraexemplo material: FREEZE_VOTED individual antes de decide pode prender uma honesta num ramo que não foi finalizado, enquanto outra view decide ramo incompatível permitido pelo núcleo, reduzindo progresso mesmo depois da rede recuperar. Retransmitir a mesma transição só ajuda se ela ainda é admissível. Persistir antes do voto e obter certificados antigos/novos não são prova completa de safety/liveness entre epochs. Sem resolução/refinamento, adaptação permanece bloqueada para aprovação técnica.

R35 especifica campo/codificação de Shamir, S/U32B, HKDF separado por finalidade/contexto, GCM one-shot por KEK, M0/Mfinal autenticados externamente e UX de perda de device/material/share inválida/U perdido/kitvelho. Kit com hashes/verificadores depende de segurança computacional da composição, não herda segredo informacional global de Shamir isolado. Recuperar roots não recupera estado/autoridade atuais. U precisa sobreviver fora do dispositivo e de backups/domínios de partes/envelopes, sem Auth/backend bypass.

A3 usa **TUFspec1.0.37** como base publicada, com bootstrap externo, cadeia de metadata/targets/hash/plataforma/versões, rotação de root old+new, anti-downgrade e expiry. Thresholds root/targets2-de-3 e tempos48h/7d/30d/365d são propostas técnicas ao CEO, não parâmetros já aprovados. TUF/HTTPS/assinatura isolados não provam cliente benigno; limiar de release/root comprometido pode autorizar pacote malicioso válido. A3-BOOT/STATE continuam bloqueios antes de chamar distribuição confiável.

O36 detalha quatro domínios, common-control e falhas correlacionadas, restart/restore, troca operador/DR, auditoria e orçamento inicial/mensal/eventual por categorias. Compute público ilustrativo quatroVM: USD22,54/mês, ou USD45,08 com2VM/domínio; parcela OVH é anúncio “a partir de” na linhaVPS2027, sem disponibilidade/termos atuais confirmados. Custos humanos/custódia/auditoria/backup/monitoramento/distribuição e total real não foram cotados; incógnitas não são zero. Nenhuma contratação/provisionamento ou custo total/SLA aprovado.

## Documentos e revisão

| Arquivo existente | Finalidade atual |
| --- | --- |
| [PRODUCT_DECISION.md](PRODUCT_DECISION.md) | Autoridade/supersessão, decisões e pendências técnicas/residuais |
| [E2EE_ARCHITECTURE.md](E2EE_ARCHITECTURE.md) | Fronteiras, cliente verificável e updateTUF, parâmetros/limites |
| [SYNC_AND_INTEGRITY.md](SYNC_AND_INTEGRITY.md) | Perfil consenso/mensagens, pacemaker, persistência/restore, handover/A1/barrier |
| [KEY_MANAGEMENT_AND_RECOVERY.md](KEY_MANAGEMENT_AND_RECOVERY.md) | R35 concreto, formatos/contexto, geração/rotação, kit/UX e perda |
| [CLIENT_FINANCIAL_ENGINE.md](CLIENT_FINANCIAL_ENGINE.md) | Semântica/invariantes cliente, época/estado e rejeição de eventos inválidos |
| [FINANCIAL_PARITY_MATRIX.md](FINANCIAL_PARITY_MATRIX.md) | Regras rastreadas, F01 preservado e dependências de provas/protocolos |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Problemas históricos, invariantes e contraexemplos/bloqueios atuais |
| [SECURITY_GATE_CRITERIA.md](SECURITY_GATE_CRITERIA.md) | Casos falsificáveis futuros, todos NOT_RUN |
| [MIGRATION_IMPACT.md](MIGRATION_IMPACT.md) | Quatro domínios, disponibilidade/DR, custos e impacto legado/UX |
| [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md) | Fontes/autoridade/hashes e lacunas, mantido pelo principal |
| [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md) | Pareceres históricos preservados e revisão atual quando concluída pelo dev-seguranca |
| [GATE_RESULT.md](GATE_RESULT.md) | Estado/verificações/Git e encerramento pelo principal |

Esta especificação altera materialmente a proposta Security05.1; hashes/pareceres anteriores não a aprovam. Arquiteto trabalha em seus10docs e encerra; depois dev-seguranca revisa adversarialmente em sequência, sem sobreposição e sem subdelegação. Quatro fontes em sources permanecem históricas/inalteradas, inclusive links/autorizações antigas que não se tornam instruções vigentes.

## Checkpoint e continuidade

| Campo | Fato / limite |
| --- | --- |
| Back início/fase atual | codex/security05-protocols, HEAD22ee3b0b959832b1293e37eef217d926a40db3e6,13Markdown modificados não preparados,4fontes preservadas |
| Front | codex/agent-team-design-skills, HEAD8c8c4f548023aadce4da1aadb0afe2778db0c455, limpo |
| Worktrees | Um por repositório, sem operação Git de escrita neste gate |
| Governança/perfis | Política/checkpoint/oito definições comuns iguais, reconfirmados; preservados |
| Runtime/controles | Config completa NOT_PROVEN aceita; sandbox workspace-write/rede restrita/auto-review declarados, sem mudanças; isolamento por papel não demonstrado |
| Fontes novas | HotStuffv6 e TUFspec oficiais consultados por leitura; preços públicos pesquisados pelo principal, sem contratação |
| Empiria | NOT_RUN: PoC/tests/model-checking, recovery real, paridade, hosted, desempenho/DR; segurança NOT_PROVEN |
| Bloqueios | Q-PACE/Q-RECOVER/Q-RECONFIG/Q-BOOT-FRESH, A3-BOOT/STATE, R35-COMP/OPS, P2 e custo/independência real |
| Estado de revisão | Atual pendente, nenhum resultado inventado; final máximo DOCUMENTATION_REVIEWED_NOT_APPROVED |
| Liberações | Nenhuma implementação/Security06/MDL13/MDL14; sem commit/publicação adicional |

Próximo gate recomendado após revisão: resolver documentalmente adaptações materiais/parametrização e submetê-las ao CEO, especialmente handover/freeze parcial, reconstrução de votos/locks, bootstrap/tempo do updater e metadados/custeio. Somente uma autorização separada poderá liberar futura validação isolada com dados sintéticos/oráculos independentes. Encerrar esta rodada após a revisão/relatório e aguardar CEO; não chamar Security05 aprovado ou pronto para implementação.
