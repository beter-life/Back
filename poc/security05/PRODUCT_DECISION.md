# Security05.2 — decisões executivas, hipóteses e bloqueios

Estado: REVISION_PENDING_INDEPENDENT_REVIEW. Limite de encerramento DOCUMENTATION_REVIEWED_NOT_APPROVED. Direção executiva aprovada não é protocolo aprovado, implementação autorizada ou segurança demonstrada.

## Autoridade e precedência

Fonte primária vigente: pedido direto do CEO “BETER LIFE — SECURITY05.2 / Fechamento documental dos protocolos de segurança”, fornecido no anexo Texto colado.txt e identificado em SOURCE_PROVENANCE. Autoriza somente atualizar/revisar documentos existentes em Back/poc/security05. Não autoriza código, PoC, testes experimentais, migrations, banco/infra, instalação, configuração, commits ou publicação. MDL13/MDL14 continuam BLOCKED; Security06 não autorizado.

Baseline preservado anteriormente: codex/security05-protocols@22ee3b0b959832b1293e37eef217d926a40db3e6, parent ceea9e7e95527fa8039283135fc477c84c4ad63b. Este gate começa com13 Markdown modificados não preparados e quatro fontes históricas preservadas,17arquivos existentes. Não cria commit adicional nem altera histórico para “consolidar” o texto.

Security05.2 substitui precisamente: escolha antes pendente entre Q23-A/Q23-B; hipótese de A1 serializadora ativa; direção O36 de três domínios; pendência de selecionar U de posse forte. Vigentes agora: quatro/q3/HotStuff, A1 complementar, quatro operadores/domínios e U32B aleatório. Não substitui pendências de prova/refinamento, metadadosP2, autoridade de configuração, update threshold/expiração, operadores/custos/SLA ou evidências históricas ausentes. Alternativas superadas e revisões permanecem no Git/INDEPENDENT_REVIEW, sem continuar como fallback neste corpo.

## Políticas e direção atual

| Tema | Decisão aprovada | O que não foi comprovado/aprovado tecnicamente |
| --- | --- | --- |
| P1 | E2EE obrigatório; valores/saldos/resultados/conteúdo privado nunca legíveis em servidores; cálculo cliente confiável; nenhuma root privada/DEK/S/U/recovery em backend/logs/métricas/IA | Segurança sistêmica, implantação e conformidade atuais não foram testadas |
| P2 | Conteúdo e relações privadas cifrados; inventário e minimização de transporte/Auth/tamanho/tempo; nenhum índice/metadado financeiro adicional exposto sem CEO | Codec, compromissos, canal/device/N, public roster e inferências precisam de avaliação/autorização específica |
| P3/Q23 | Quatro testemunhas independentes, quorum3, HotStuff auditável; alvo até1bizantina sob backend+SQL+Auth comprometidos simultaneamente | Refinamento BasicHotStuffv6, persistência/restore, pacemaker e reconfiguração não demonstrados;3assinaturas não bastam |
| A1 | Piso/comparação independente complementar; sem autoridade de serializar ou ignorar consenso | Bootstrap, clonagem/replay de piso e perda de todos os mínimos atuais precisam de fechamento; A1 não é requisito online em cada transação |
| P4/R35 | S intermediário aleatório, Shamir3/5(S), U independente32B aleatórios, HKDF-SHA256 conjunto, GCM nas roots; nenhuma colusão simples de três ou Auth recupera sozinha | Biblioteca/interop, composição criptográfica, cerimônia/custódia/backup, RNG/nonce/rotation e recovery end-to-end não executados; senha fraca exige nova decisão |
| P5 | Sem atualidade/prova/quorum válido: sem confirmação/saldo atual/STS válido; só snapshot local antes verificado/datado e rascunho cifrado fora de relatórios confirmados | Semântica/UX de validade, parâmetros de frescor e retomada ainda precisam de refinamento, sem reduzir fail-closed |
| P6/O36 | Quatro domínios/operadores, keys/admin/infra/incidentes separados, auditoria pré-produção e pós-mudanças, monitoramento/DR e sustentabilidade | Fornecedores não são operadores escolhidos; custo total/SLA/contratos/independência ainda NOT_PROVEN |
| A3 | Cliente instalado assinado/verificável e distribuição/update independentes do backend; não aceitar JS malicioso da origem | Perfil TUF e bootstrap/estado/thresholds/expiry/recuperação de root comprometida ainda dependem de validação e decisões técnicas |

Estados executivos anteriores preservados no escopo compatível: P2=POLICY_APPROVED_TECHNICAL_DETAILS_PENDING; P3=THREAT_POLICY_APPROVED_PROTOCOL_NOT_PROVEN; P4=RECOVERY_POLICY_APPROVED_PROTOCOL_NOT_PROVEN; P5=FAIL_CLOSED_POLICY_APPROVED; P6=OPERATIONAL_POLICY_APPROVED_COSTS_AND_OPERATORS_PENDING. A definição histórica P3/P6 de três domínios e R35U ainda pendente está superada pela decisão atual, não pela equipe.

## Perfil proposto, distinto da decisão executiva

Q23 seleciona documentalmente Basic HotStuffv6 Algorithm1/2, membership fixo por epoch, fases/locks e pacemaker simples publicado §4.4; separa as adaptações de persistência, READ_BARRIER e FREEZE–INSTALL–ACTIVATE. F02 (descender de justifyQC.node E safeNode) permanece obrigatório. Publicação não prova o refinamento Beter Life. A transição entre epochs e restore com locks perdidos são bloqueios materiais, não corrigidos por última commitQC.

R35 mantém o perfil concreto S/U32B, Shamir em campo primo2^521−1, HKDF-SHA256 e GCM one-shot por KEK/purpose/envelope. M0/Mfinal/assinaturas/contexto e kit autenticado fora do servidor especificam bootstrap; U está selecionado, mas seu suporte e cerimônias não são controles já demonstrados. Ver KEY_MANAGEMENT_AND_RECOVERY.

A3 propõe TUFspec1.0.37 com raiz externa, root/targets/snapshot/timestamp, anti-rollback/expiry e rotação por limiares antigo+novo. Parâmetros de threshold/tempo são propostas, não novas políticas selecionadas silenciosamente. O36 estrutura quatro domínios, matriz de falhas e custo inicial/mensal/eventual com incógnitas e referências públicas “a partir de”, sem total real inventado.

## Bloqueios técnicos e decisões residuais do CEO

| ID | Parte dependente bloqueada | Resolução necessária |
| --- | --- | --- |
| Q-PACE | Garantia de progresso do pacemaker integrado ao runtime/storage | Refinar construção publicada, relógios, timers/limites e catch-up sem modificar safety; revisão/formalização e ensaio futuro autorizado |
| Q-RECOVER | Nó votando após backup velho/log incompleto/clone | Estado íntegro dos votos/locks pendentes e fencing demonstráveis ou substituição segura; sem isso nó permanece RECOVERING, mesmo com chave e último decide |
| Q-RECONFIG | Aprovação técnica do handover entre epochs | Prova/refinamento das guardas FREEZE_VOTED, retry da mesma transição, FreezeCert+InstallCert+ACTIVATE, autorização/continuidade e casos de quorum antigo perdido |
| Q-BOOT/FRESH | Claim atual de novo cliente após perda de todos mínimos/configs recentes | Bootstrap externo e lineage/barrier atuais sustentados; kit/história antiga assinada não prova atualidade |
| A3-BOOT/STATE | Tratar distribuição como confiável para plaintext | Canal inicial/raiz externos, updater/estado anti-rollback/tempo por plataforma, resposta a comprometimento e evidência independente; TUF/HTTPS isolados não bastam |
| R35-COMP/OPS | Aprovação da composição/custódia/rotação/UX | Implementação auditável, interop/vetores independentes, proteção de U fora do dispositivo/backups, não repetição KEK/IV e recuperação atual sem bypass |
| P2/O36 | Expor metadados, contratar ou liberar produção | Autorizações campo a campo, operadores reais, separação auditável, cotações/custo total/orçamento/SLA sustentáveis |

Perguntas que permanecem ao CEO sem rediscutir a direção escolhida: aceitar ou revisar thresholds/expirações propostos para A3 e autoridade criptográfica de configuração; quais metadados técnicos mínimos/inferências autorizar; quais suportes/custódios/operadores e orçamento/SLA aprovar após evidências? Contradição material será submetida antes de mudar política. Não declarar o gate inteiro impossível por lacuna localizada; bloquear somente conclusão dependente.

## Riscos e parada

Dispositivo/SO ou limiar de release/root comprometido pode expor dados em uso; atualização não retira conhecimento já adquirido. Colusão acima de1testemunha, perda total de referências, indisponibilidade, metadados e legado são limites explícitos, sem resistência absoluta. Pierre é expectativa de UX, não fonte de mecanismos internos. Open Finance/IA/importação que exijam plaintext em servidor/terceiro incompatível ficam BLOCKED, sem exceção implícita.

Handoff mestre permanece fonte histórica secundária; originais técnicos Security02–04 ausentes/NOT_PROVEN. Quatro fontes financeiras históricas não comprovam implantação atual nem paridade integral. Próximo trabalho: revisão adversarial desta consolidação e fechamento documental dos bloqueios e parâmetros antes de solicitar qualquer ensaio isolado ao CEO. Nenhum Security05 aprovado, READY_FOR_IMPLEMENTATION ou Security06 autorizado.
