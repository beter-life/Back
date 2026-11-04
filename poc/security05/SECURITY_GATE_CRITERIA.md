# Security05 — critérios para gates futuros

Todos os ensaios abaixo são planos NOT_RUN, com eficácia NOT_PROVEN. Este documento não autoriza executá-los. Cada gate futuro exige escopo/ambiente/dados sintéticos/limites/autoridade explícitos do CEO, fontes fixadas e ausência de segredos nos artefatos.

## Pré-condições antes de PoC

Políticas P2–P6 já aprovadas, conforme estados exatos em PRODUCT_DECISION. Antes de qualquer execução futura, fechar detalhes pendentes P2 e protocolo normativo de envelopes/autorização/finalização/recuperação, fontes financeiras faltantes, versões de regras, modelo conjunto de adversário e colusão, distribuição instalada e operadores/custos/SLA concretos. Resolver Q23/R35, achados independentes e obter autorização humana específica de execução. Não chamar política aprovada protocolo aprovado; documentação completa não implica implementação aprovada.

## Estrutura de evidência

Cada caso: ID histórico/regra → ameaça → premissas → estado sintético inicial → injeção → observação por instrumento independente → resultado esperado → limite → log sanitizado/hash/versão. Incluir controle positivo, negativo e adulteração do detector; não usar motor novo como único oráculo. Retenção de logs sem plaintext financeiro/chaves; marcadores sintéticos permitem provar ausência de vazamento sem dados reais.

| Gate candidato | Injeções mínimas | Condição de reprovação / evidência necessária |
| --- | --- | --- |
| G-CONTENT | Credencial gateway, dump/backup, memória, logs/traces/métricas/exports/cache/API e parser com marcadores sintéticos | Qualquer plaintext financeiro/DEK/fator privado no servidor reprova P1; inventário deve cobrir todos os consumidores |
| G-AUTHORITY | Trocar raiz, owner, domínio de assinatura, dispositivo/época; JWT roubado/reset Auth; MITM de pareamento | Nenhuma admissão/substituição sem autoridade aprovada; bootstrap fora do backend demonstrado |
| G-INTEGRITY | SQL privilegiado insere sem comando, troca valor/moeda/cutoff, remove/cancela/duplica/reordena, altera cache/view/RPC | Zero efeito indevido aceito em cada consumidor; escrita bruta permitida pelo admin é distinta da aceitação financeira |
| G-FRESHNESS | Restaurar banco/âncora separados e juntos, apagar referência recente, omitir página/sufixo/dependência, forks por dispositivo, signatário comprometido/rotacionado | Se prova insuficiente: bloquear confirmação e headline atual; detectar dentro de premissas explícitas, sem prometer detecção universal |
| G-REPLAY | Resposta perdida, reenvio de bytes e nova cifragem do mesmo comando, concorrência após reinício/restore | Exatamente um efeito por identidade financeira válida; conflito de payload e revogação obedecem estado verificável |
| G-ATOMIC | Interromper bundle transferência/Inbox/receipt em cada fase; corridas edit/discard/confirm/reverse entre dispositivos | Sem metade financeira, efeitos duplicados ou reversão de link posterior; critério de finalização explícito |
| G-RECOVERY | Perder todos os dispositivos/controlador online; usar fatores independentes num cliente limpo; backups velhos/owner/época errados; perda total | Recuperar somente com autoridade/fatores válidos e estado sustentado; custódia física/administrativa evidenciada; nenhum bypass por servidor/Auth |
| G-CLIENT | Origem e CI maliciosos, release antigo, raiz de update trocada, assinatura/revogação e comprometimento de dispositivo | Garantia corresponde a P3; CSP/HTTPS/chave não exportável não contam como resistência ao próprio distribuidor |
| G-PARITY | Executar vetores independentes da matriz financeira em todos consumidores com versões/cutoff iguais | Zero divergência sem justificativa/regra aprovada; preservar semântica de imports, inbox, managed boundaries e reconciliação |
| G-OFFLINE | Partição, relógio alterado, perda de referência/quórum, intenções concorrentes e retorno com revogação | Nenhuma intenção exibida como confirmada; leitura só conforme P5, histórico datado e sem Safe to Spend atual |
| G-HOSTED | Só em ambiente isolado autorizado: PG/Supabase/Auth/JWKS/pooler, TLS CA+hostname, grants/RLS, limites/durabilidade e backup/restore | Versões reais e restauração integral verificadas; não extrapolar local nem confundir leitura de archive com restore; sem DEV como primeiro experimento |
| G-OPERATIONS | Falhas por domínio, incidente de assinatura, custo/volume/RAM/tempo, auditoria de acesso compartilhado | Independência e SLO acordados evidenciados; operadores e dependências comuns documentados; simulação não prova custódia física |

## Obrigações adicionais das políticas executivas aprovadas

| ID | Critério falsificável futuro, ainda NOT_RUN | Bloqueio e limite |
| --- | --- | --- |
| G-Q23-SAFETY | Formalizar estados/mensagens/assinaturas e provar que clientes corretos não aceitam X e Y incompatíveis sob backend+SQL+Auth+uma testemunha comprometida; tratar {B,H1}/{B,H2}, com cada honesta assinando um ramo | Contar 2 assinaturas reprova a justificativa. A análise atual é contraexemplo documental, não teste. Não mudar silenciosamente meta3/quórum2; mecanismos adicionais A1/A3 precisam de prova |
| G-Q23-LIVENESS | Especificar progresso e limites sob partição, atraso, withholding e indisponibilidade/compromisso de uma testemunha; analisar papel normativo da referência pessoal | Sem condições de rede/tempo/disponibilidade explícitas, não afirmar liveness; fail-closed não é garantia de progresso |
| G-Q23-CONTINUITY | Analisar bootstrap de novo cliente, clientes divergentes, rotação/reconfiguração de testemunhas, perda/restore de todas as âncoras, revogação e proteção anti-downgrade | Mesma chave/assinatura ou chain autêntica não comprova referência atual; perda de âncora não autoriza reset silencioso |
| G-R35-CONJUNCTION | Construção revisada permite recuperar com3shares+fator correto, mas não com3shares sem fator nem menos de3 com fator; testar custódio malicioso, share incorreta/owner/época, roubo e rotação | Compartilhar diretamente DEK em3-de-5 não cumpre a política; tela/senha Auth/rate-limit servidor não prova participação criptográfica |
| G-R35-INDEPENDENCE | Analisar resistência a tentativa offline com3shares e fator de baixa entropia; fator em backup comum, exportação/restauração e recuperação do fator pelos mesmos custódios/Auth | KDF nomeada não prova resistência; fluxo alternativo que dispensa usuário é bypass. Perda de todos os meios necessários deve resultar em perda definitiva comunicada, sem backdoor |
| G-P2-PRIVATE-LINKS | Inventário de envelopes, índices, compromissos, logs, backups e suporte; inferência por ids/grafos/tamanho/tempo; avaliar padding proporcional ao risco | Nenhuma relação privada/índice adicional financeiro exposto sem CEO; conteúdo cifrado não prova vínculos privados |
| G-P3-INSTALLED | Origem/CI/backend maliciosos não substituem silenciosamente cliente instalado nem update; raiz inicial, assinatura/revogação/anti-downgrade e distribuição independentes evidenciadas | Não aceitar web dinâmica atual, HTTPS/CSP/SRI da mesma origem como prova. Dispositivo/SO ou chaves de distribuição comprometidos continuam limites |
| G-P6-SUSTAINABILITY | Demonstrar três operadores/domínios independentes em chaves/admin/infra/incidentes; auditoria independente pré-produção e pós-mudanças, monitoramento, exercícios recovery; custo total/SLA obtidos e aprovados | Não inferir oito operadores de3testemunhas+5shares; sobreposição/cross-colusão precisa de análise. Se garantias inviáveis, bloquear lançamento sem reduzir política |

G-OFFLINE deve cobrir expressamente P5: sem referência atual/prova/quórum, nenhum saldo como atual, confirmação ou Safe to Spend válido; permitir somente snapshot local previamente verificado e datado/desatualizado e rascunho cifrado fora de saldos/relatórios confirmados. Retomada valida integralmente autorização/revogação, histórico, regras, dependências e finalização. Recursos Open Finance/IA/import que exijam plaintext em servidor/terceiro incompatível permanecem BLOCKED, sem execução de integração para tentar contornar P1.

## Classificação e saída

PASS significa apenas critério verificado no ambiente/premissas identificados. FAIL é violação; PARTIAL cobertura incompleta; NOT_RUN não executado; NOT_PROVEN evidência insuficiente; SIMULATED simulação. Separar prevenção, detecção, contenção, disponibilidade e recuperação. Um detector que encontra adulteração não transforma prevenção de SQL em PASS. Originais históricos continuam NOT_PROVEN até recuperação/análise; nova PoC não reescreve resultados antigos.

Aprovação futura deve citar gate e escopo. As políticas executivas estão aprovadas, mas ensaios e garantia de segurança continuam NOT_RUN/NOT_PROVEN. Sem nova autorização específica não há execução, produto, migration, MDL13/14 ou Security06. Critérios com detalhes/protocolos/evidências ausentes ficam bloqueados somente na parte dependente.
