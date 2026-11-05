# Security05.2 — operação em quatro domínios, custos e migração

Estado: REVISION_PENDING_INDEPENDENT_REVIEW. Direção executiva O36: quatro testemunhas/domínios realmente independentes, consenso3-de-4; números de custo abaixo não aprovam orçamento/SLA/produção. Código, banco, infraestrutura, dependências, migrations, commits adicionais e recursos contratados não fazem parte deste gate.

## Domínios, funções e orçamento de comprometimento

D1..D4 correspondem a quatro operadores/domínios com chaves de testemunha, credenciais administrativas, contas de infraestrutura, logging/backup, caminhos de deployment e incident response separados. Quatro VMs geridas pelo mesmo root/IdP/operador não são quatro domínios; provedores distintos com CI/cofre/admin comum também não. Identificar acesso transitivo e quem pode restaurar/clonar/assinar, não só titular da fatura.

| Função | Custódia/estado candidato | Risco e evidência exigida |
| --- | --- | --- |
| W1..W4 / D1..D4 | Uma identidade/voto lógico por domínio; keys, config/época, views, votos/locks e freeze duráveis | Matriz de acessos prova isolamento; um comprometimento operacional não pode controlar duas testemunhas dentro de f1; vendor/root/IdP/CI compartilhado é risco correlacionado explícito |
| Standby no mesmo domínio | Replica bytes/estado de voto sob mesmo controle; somente um signatário ativo por identidade | Failover com fencing e monotonicidade, sem contar duas VMs como votos; backup recente não garante locks pendentes |
| A1 complementar | Piso independente sob usuário, comparação autenticada entre devices/kit externo | Não servidor serializador ou serviço online obrigatório; cópia velha/clonada pode ocultar detecção e não ignora consenso |
| A3 distribuição | Raízes de updater/release e aprovação separadas do backend/CI; thresholds TUF propostos | Assinadores/operadores concretos e sobreposição com D1..D4 precisam de audit; f1 de consenso não aprova orçamento de falha de release |
| Cinco partes R35 e U | ShareRecords offline/kit autenticado; U32B em posse independente, cópia que sobreviva ao dispositivo | Nove funções não são nove entidades independentes provadas nem overlap autorizado; mapear domínio de backup/IdP e colusão cruzada |
| Backend/Auth/DB | Serviço/transporte/bytes opacos, nenhuma DEK/S/U/root privada/recovery | Comprometimento conjunto desses componentes mais uma witness está no modelo; nenhuma conta deles administra testemunhas ou distribuição |

Hipótese de segurança: no máximo uma das quatro testemunhas bizantina sob comprometimento simultâneo backend+SQL+Auth. Compromisso de fornecedor/administrador comum que dê duas chaves sai desse orçamento e reprova a justificativa de independência, sem ser “duas falhas improváveis”. Controles de hardware e cofre não provam separação humana/organizacional por si só.

## Disponibilidade, restart e desastre

| Cenário | Condição de progresso do consenso4/q3 | Conduta financeira |
| --- | --- | --- |
| Quatro íntegras/ativas | Líder/view e rede satisfazem hipóteses do BasicHotStuff/pacemaker | Cliente ainda precisa de dados/provas/semântica, não só QC |
| Uma falha ou uma bizantina retendo voto | Três honestas responsivas com estado/bytes íntegros podem progredir após condições pós-GST | Sem promessa de tempo/SLA a partir dessa contagem |
| Uma bizantina withholding + outra honesta indisponível | Apenas duas respostas úteis, sem quorum3 | Fail-closed; histórico local verificado/datado e rascunho conforme P5, sem saldo atual/confirmar/STS válido |
| Partição, dados omitidos ou quorum não verificável | Liveness não prometida | Não contar respostas de cache ou aceitar assinatura isolada |
| Reinício com log íntegro | Repor todos votos/locks/prepareQC/view/config/freeze e identidade exclusiva antes de votar | Catch-up com provas, nunca resetAuth ou limpeza de cache |
| Backup velho/perda de log/clone | Último decide não restaura necessariamente locks/votos pendentes | Nó RECOVERING sem voto até prova suficiente ou substituição segura; total perda/locks impede reset |
| A1 fora do ar | A1 não é coordenador; cliente existente pode usar consenso/provas suficientes e mínimo confiável | Novo cliente/perda total de mínimos precisa de bootstrap/lineage atual sustentados; sem eles congela claim atual |
| Perda de partes/U/release íntegro | R35/A3 têm dependências próprias, mesmo com quorum disponível | Dados/chaves não devem ser expostos a binário não verificável ou recuperados por bypass |

Troca de operador/identidade exige transição segura; FREEZE–INSTALL–ACTIVATE em SYNC é candidato ainda aberto, com autorização cripto de config, terminal antigo, instalação e ACTIVATE nova. E-mail/Auth não basta. Se líder retiver certificado, a proposta permite retransmitir/coletar a MESMA transição, sem voltar ao normal por timeout. Porém freeze individual antes de decisão pode prender uma honesta se outra view decidir ramo incompatível com o freeze nãofinalizado; isso ameaça progresso mesmo com rede recuperada e não foi resolvido por persistência. Q-RECONFIG continua bloqueio material de safety/liveness; não operacionalizar esse candidato como procedimento de produção. Sem estado/provas suficientes, congelar e submeter ao CEO, não abort/reset de emergência por conveniência.

Monitoramento técnico: latência de mensagens/QC e health, divergência de heads/epochs, erros de assinatura, espaço/durabilidade do log, integridade de backup e exclusividade de signatário. Nada de montante, descrição, payload privado, root ou fator em métricas/traces. Mesmo canal/N/tempo/signers precisam de minimização P2, retenção e autorização específicas. Métrica “saldo correto” fornecida pelo servidor não prova finanças.

Incidente: detectar → congelar scope/claim atual afetado → preservar evidência técnica sem segredo → classificar orçamento de falhas → revogar/rotacionar conforme autoridade válida → reconfigurar somente com continuidade provada → restaurar isoladamente e comparar estado recente independente → revisão/CEO antes de retomada. Se reconfiguração/restore seguro não é demonstrável, etapa fica BLOCKED; não trocar genesis ou raiz silenciosamente. Root de release comprometida pode exigir reprovisionamento externo, não só nova assinatura da mesma origem.

Auditoria externa pré-produção e reavaliação após mudanças críticas cobrem protocolo, refinamento/crash, independência de operadores, release/updater, custódia, backup/DR e ensaios com oráculos independentes. Exercises periódicos de perda de dispositivo/domínio/custódio e recovery, com cadência/escopo ainda a aprovar; documentação não prova exercício.

## Custos: fatos públicos, cenários e incógnitas

Referências consultadas pelo principal em2026-11-04: [DigitalOcean](https://www.digitalocean.com/pricing/droplets) Basic Regular1GiB/1vCPU/25GiB/1000GiB transfer USD6/mês; [Akamai](https://www.akamai.com/cloud/pricing/cpu) Nanode1GB/1CPU/25GB/1TB USD5/mês; [AWS Lightsail](https://aws.amazon.com/lightsail/pricing/) LinuxIPv4 1GB/2vCPU/40GB/2TB USD7/mês. Quarta referência: [OVHcloud US VPS](https://us.ovhcloud.com/vps/), VPS-1 da linha anunciada **VPS2027**, **a partir de USD4,54/mês**,2vCores/4GB/40GBNVMe e backup diário anterior24h. Disponibilidade atual, região, período, tributos, renovação e condições contratáveis da quarta oferta não foram confirmados. São preços públicos ilustrativos, não contratos ou operadores escolhidos.

| Cenário atual4domínios | Compute mensal de referência | Limites |
| --- | --- | --- |
| B4:1VM/domínio | 6+5+7+4,54=USD22,54/mês | Quarta parcela é preço anunciado “a partir de”; sizing não medido, configs não equivalentes, termos/cotas pendentes |
| H4:2VM/domínio | 2*22,54=USD45,08/mês | Mesmo4votos; standby não cria independência e requer fencing/replicação de estados pendentes |
| Capacidade/termos reais distintos | soma dos quatro preços cotados e aceitos para capacidade efetivamente necessária | Referência pública pode não ser contratável nessa região/prazo ou suficiente para log/DR |

Os antigos cenários3domínios/USD18/USD36 não são direção operacional atual nem alternativa para economizar sem CEO; só histórico no Git/revisão. Não comparar máquinas só por nome ou assumir1GB comporta testemunha. Backup automático de fornecedor não prova restore de lock/freeze seguro e pode ser caminho de rollback.

Definir variáveis monetárias em USD somente quando cotadas nessa moeda; despesas em outra moeda ficam separadas até câmbio/tributação aprovados. `?` significa não obtido, nunca zero. Separar mensal recorrente, custo inicial e auditorias/eventos:

| Categoria | B4 mensal / H4 mensal | Implantação inicial | Periódico/por evento | Evidência pendente |
| --- | --- | --- | --- | --- |
| Infraestrutura compute/rede | referência22,54 /45,08 + tráfego extra real | setupInfra_B/H=? | recuperação/migraçãoInfra=? | Capacidade, regiões, termos, IP/tráfego e cotações |
| Operação humana | soma(horas_i * tarifa_i),i1..4, todos? | onboarding/treinamento4operadores=? | plantão/incidente/substituição=? | Operadores independentes e propostas comerciais, nenhum rate/hora inventado |
| Armazenamento/backups | logStorage+backupStorage+egress=?, por4domínios | bootstrap/log/backup/fencing=? | restore isolado/retenção=? | Volume/crescimento, controles anti-rollback e ensaio |
| Custódia/chaves | hardware/cofre/manutenção+partes/U=? | aquisição+cerimônia+entrega partes/U=? | rotação/recovery/perda=? | Custódios/suportes/overlap e custos reais |
| Auditorias | mensal somente se contrato cotado, atualmente? | auditoria pré-produção=? | reauditoria crítica/periódica=? | Escopo, auditor externo e orçamento |
| Monitoramento | monitoramento técnico+armazenamento sanitizado=? | configuração independente=? | incident response/exercise=? | Vendor/credenciais/retention/plantão |
| Distribuição confiável | assinatura/repos/espelhos/infra updater=? | trust bootstrap/root/release/pipeline=? | revogação/reprovisionamento=? | Plataformas, threshold/custódios e cotações |

Fórmulas por cenário s: **M_s = Compute_s + Traf_s + OperHum_s + StoreBackup_s + Cust_s + AuditRec_s + Monitor_s + Distrib_s**; **I_s = SetupInfra_s + Onboarding_s + InitBackup_s + InitCust_s + AuditPreProd_s + InitMonitor_s + InitDistrib_s**; **E_s = Restore_s + Incident_s + Rotate_s + ReauditCritical_s + Reprovision_s**, por eventos efetivos. Horizonte H meses: **T_s(H)=I_s + H*M_s + soma(eventos E_s)**, acrescido de tributos/câmbio somente com premissas aprovadas. Essas fórmulas são estimativa estruturada completa por categoria, não total quantitativo contratável; a maioria das parcelas é desconhecida.

Nenhum recurso contratado/provisionado/comprado; custo de execução dos agentes/ferramentas não apurado. Total numérico de produção, SLA e sustentabilidade: NOT_PROVEN. Cotações e orçamento aprovado são bloqueios específicos de lançamento, sem preencher incógnitas com zero ou converter compute mínimo em custo total.

## Migração do produto atual e UX

Backend/API/SQL monetários, parser/mapping/hints/matcher privados e summaries terão de ser redesenhados para cliente instalado e envelopes opacos em gate futuro. RLS/grants/ownership continuam controle comum de acesso, não proteção absoluta contra admin. Preservar regras econômicas e provenance de Inbox/import/reconciliation, sem copiar DTO plaintext ou grafo privado para indices públicos. Sem code/DDL/migration neste gate.

A3 acrescenta instalador confiável, atualização verificada e incidentes de release; R35 acrescenta kit, três partes e U separado sobrevivente ao dispositivo. Quorum distribuído pode acrescentar latência e períodos sem confirmação. Mostrar motivos/estado e data de verificação; não simular sucesso financeiro para parecer fluido. Expectativa Pierre é referência de experiência, não fonte de mecanismos internos. Open Finance/IA/importação com plaintext em servidor/terceiro incompatível fica BLOCKED; estudar processamento local não autoriza implementar integração.

Recifrar não apaga exposição anterior em WAL/backups/logs/memória/exportações nem retira conhecimento de dispositivos antigos. Snapshot/manifest inicial aceito hoje precisa declarar fonte/escopo/cutoff/moeda/versões/lacunas; não significa assinatura original de cada evento. Migração/rollback operacional não pode reabrir plaintext nem reduzir epoch de dados/config/update. Legado, downtime e retomada exigem gate separado.

Se não houver safety demonstrável entre epochs/restore, distribuição confiável, fatores/custódia viáveis ou custo total sustentável/operadores independentes, bloquear lançamento dependente e submeter ao CEO. A política não pode ser reduzida para caber no orçamento ou UX. Próximo trabalho recomendado é fechar as adaptações e parâmetros documentais antes de pedir ensaio isolado explicitamente autorizado; não iniciar Security06.
