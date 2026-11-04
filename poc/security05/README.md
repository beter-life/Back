# Security05 — consolidação de políticas e redesenho condicionado

Data: 2026-11-04. Estado desta consolidação: **DOCUMENTATION_REVIEWED_NOT_APPROVED**. A política executiva P2–P6 está aprovada; o desenho foi revisado documentalmente pelo dev-seguranca, mas Q23/R35 permanecem bloqueios técnicos P1 abertos. Desenho técnico, implementação e segurança demonstrada não estão aprovados.

## Autoridade e escopo atuais

Fonte primária: pedido executivo “Decisões executivas P2–P6: política de segurança máxima”, no anexo `Texto colado.txt`, identificado em [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). Autoriza somente atualizar/revisar os 17 documentos existentes neste diretório. As pendências anteriores de política P2–P6 foram substituídas por essa decisão, sem reescrever evidências históricas ou aprovar detalhes técnicos.

Preservar todos os arquivos, cópias históricas e fontes. Nenhum código funcional, configuração, política compartilhada, PROJECT_STATE, banco/infraestrutura, dependência ou migration pode mudar. Sem PoC, testes experimentais, instalação, commit/push/merge/deploy, aprovação Security05, Security06 ou liberação MDL13/MDL14. O nome `poc/` é localização documental; não foi criado experimento executável.

P1=E2EE: conteúdo/valores financeiros cifrados, cálculos em cliente confiável; servidor sem plaintext financeiro ou chaves de descriptografia/recuperação; Auth não concede autoridade criptográfica. Sem segredos/conteúdo privado em logs, métricas ou IA.

## Estado executivo versus técnico

| Política | Estado exato | Consequência documental |
| --- | --- | --- |
| P2 | POLICY_APPROVED_TECHNICAL_DETAILS_PENDING | Conteúdo/relações cifrados; mínimo transporte/Auth inventariado; nenhum índice/metadata financeiro adicional exposto sem CEO |
| P3 | THREAT_POLICY_APPROVED_PROTOCOL_NOT_PROVEN | Objetivo A2+A1+A3, três domínios/testemunhas, quórum dois, ameaça conjunta backend+SQL+Auth+uma testemunha; plaintext em cliente instalado/assinado/verificável independente |
| P4 | RECOVERY_POLICY_APPROVED_PROTOCOL_NOT_PROVEN | Offline3-de-5 E fator independente do usuário, sem colusão de três recuperar sozinha; Auth separado, sem backdoor |
| P5 | FAIL_CLOSED_POLICY_APPROVED | Sem atualidade/prova/quórum: sem confirmação/saldo atual/STS válido; somente snapshot local verificado datado/desatualizado e rascunho cifrado não confirmado |
| P6 | OPERATIONAL_POLICY_APPROVED_COSTS_AND_OPERATORS_PENDING | Três operadores/domínios independentes, auditoria, incidentes/monitoramento/recovery; custos/SLA a obter/aprovar, bloqueio de lançamento se inviável |

A política não demonstra protocolo. Q23 refuta a suficiência de aceitar duas assinaturas isoladas: {B,H1} e {B,H2} podem certificar ramos incompatíveis quando B é maliciosa e cada honesta assina somente um. É contraexemplo analítico, não teste nem impossibilidade universal de toda composição A2+A1+A3. Finalização técnica permanece BLOCKED até protocolo/prova de safety/liveness, ordem, reconfiguração, bootstrap, referência pessoal e recuperação de âncoras. Não trocar silenciosamente para quatro testemunhas ou3-de-3.

R35 registra composição de recuperação NOT_PROVEN:3-de-5 isolado permite aos três obter o segredo; a construção deve exigir adicionalmente fator independente do usuário. Fator fraco pode permitir tentativa offline; fator no mesmo backup perde independência; recuperar o fator pelos mesmos custódios/Auth pode criar bypass. Não foi selecionado algoritmo/KDF/entropia/fluxo normativo. Recuperação técnica permanece BLOCKED até análise/prova compatível. Perda de todos os meios necessários pode ser definitiva.

Três testemunhas e cinco partes de recuperação são funções, sem mapeamento de operadores/custódios aprovado. Custos, sobreposição/colusão cruzada, independência real e UX de cliente instalado podem inviabilizar operação; isso deve bloquear lançamento dependente, não reduzir metas. Open Finance/IA/imports que exijam plaintext em servidor/terceiro incompatível ficam BLOCKED.

## Leitura dos documentos existentes

| Documento | Conteúdo |
| --- | --- |
| [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md) | Fontes/autoridade atuais, hashes, fontes financeiras recuperadas e lacunas históricas |
| [PRODUCT_DECISION.md](PRODUCT_DECISION.md) | Políticas exatas, supersessão, limites e decisões técnicas ainda abertas |
| [E2EE_ARCHITECTURE.md](E2EE_ARCHITECTURE.md) | Objetivo A2+A1+A3, contratos e cliente/distribuição |
| [CLIENT_FINANCIAL_ENGINE.md](CLIENT_FINANCIAL_ENGINE.md) | Invariantes exatos, consumidores, aceitação e restrições de integração |
| [KEY_MANAGEMENT_AND_RECOVERY.md](KEY_MANAGEMENT_AND_RECOVERY.md) | Chaves/dispositivos, composição R35 e independência do fator/backup |
| [SYNC_AND_INTEGRITY.md](SYNC_AND_INTEGRITY.md) | Estado/concorrência/offline e contraexemplo/obrigações Q23 |
| [THREAT_MODEL.md](THREAT_MODEL.md) | H01–H20 históricos e Q23/R35/O36 atuais, sem inventar evidências |
| [FINANCIAL_PARITY_MATRIX.md](FINANCIAL_PARITY_MATRIX.md) | Regras por fonte e limites de paridade/dados privados |
| [SECURITY_GATE_CRITERIA.md](SECURITY_GATE_CRITERIA.md) | Critérios falsificáveis futuros, todos NOT_RUN |
| [MIGRATION_IMPACT.md](MIGRATION_IMPACT.md) | Legado, produto atual, custos/UX e bloqueios |
| [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md) | Revisão vigente do dev-seguranca, com Q23/R35 abertos e revisão anterior identificada como histórica |
| [GATE_RESULT.md](GATE_RESULT.md) | Registros do gate e resultado final atual pelo agente principal |

A revisão anterior, seus hashes e F01 corrigido pertencem ao conjunto anterior. O arquiteto consolidou estes dez documentos e encerrou; só depois o dev-seguranca revisou e encerrou, um subagente ativo por vez. O parecer atual não solicita nova correção documental material, mas mantém Q23/R35 abertos e O36 NOT_PROVEN. Depois dele, apenas estados/links editoriais de README/PRODUCT_DECISION/E2EE_ARCHITECTURE e o encerramento GATE_RESULT foram atualizados, sem mudança técnica. Separar quatro camadas: política executiva aprovada; desenho proposto; desenho efetivamente revisado; segurança demonstrada — esta última continua NOT_PROVEN.

## Checkpoint deste gate

| Campo | Fato / limite |
| --- | --- |
| Branch Front/Back inicial | codex/agent-team-design-skills |
| Back HEAD inicial | ceea9e7e95527fa8039283135fc477c84c4ad63b |
| Front HEAD inicial | 8c8c4f548023aadce4da1aadb0afe2778db0c455 |
| Árvores iniciais | Back com os mesmos17 Markdown não rastreados em Security05; Front limpo; um worktree por repositório |
| Governança/perfis | Política e oito definições comuns iguais entre Front/Back, reconfirmados |
| Configuração completa | NOT_PROVEN aceito; sem repetir diagnóstico falho ou alterar controles |
| Sandbox | workspace-write, rede restrita e auto-review declarados; isolamento fino por papel NOT_ENFORCED |
| Delegação atual | arquiteto-seguranca consolidou e encerrou; dev-seguranca revisou depois e encerrou; um subagente ativo por vez |
| Fontes financeiras | Recuperação remota feita no gate anterior em c3f975c3514173c47c4c1fd08affb64305f1efe7; quatro cópias sources preservadas; não reexecutada |
| Fontes históricas ausentes | Originais técnicos Security02–Security04 e evidências empíricas; handoff secundário; resultados NOT_PROVEN |
| Validações empíricas | NOT_RUN: PoCs, paridade, recovery real, domínio independente, desempenho e hospedagem |
| Revisão atual | Concluída; Q23/R35 técnicos P1 abertos, O36 operacional aberto; sem aprovação de protocolos |
| Aprovação técnica | Nenhuma; Q23/R35 e parâmetros/evidências pendentes bloqueiam conclusões dependentes |
| Módulos/gates | MDL13/MDL14 BLOCKED; Security06 não autorizado |

As cópias `sources/` são documentos financeiros históricos: seus comandos, links relativos e autorizações antigas não são instruções vigentes. A numeração do handoff diverge dos snapshots MDL3=orçamento; a matriz usa nomes/fontes e preserva F01. Detalhes de patrimônio/rendimentos/cartões/dívidas/Safe to Spend apenas referenciados continuam ausentes; paridade integral não comprovada.

## Próximo passo e parada

Consolidação e revisão encerradas; aguardar nova autorização do CEO. Gate seguinte recomendado: especificação e análise documental de Q23/R35, metadados e plano operacional, com decisões residuais do CEO onde necessárias. Nenhum teste, PoC ou Security06 automático. Security05 não está aprovado ou pronto para implementar; MDL13/MDL14 continuam bloqueados.
