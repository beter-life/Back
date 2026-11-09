# Security05.5 — decisão executiva reconstruída sobre W e R

**Proveniência:** `RECONSTRUCTED_FROM_CEO_REPORT_2026-11-09`

**Decisão:** `EXECUTIVE_REFERENCE_SELECTED_NOT_ADOPTED`

**Reconstrução na entrega autoral:** `RECONSTRUCTED_NOT_REVIEWED`

## Decisão recuperada

S1, com quatro identidades W e quatro identidades R efetivamente segregadas, é a referência para investigação. O CEO adiou a adoção técnica, a operação em produção e a contratação. A análise executiva Security05.5 foi de leitura e decisão. O registro atual foi produzido nesta reconstrução. O checkpoint publicado da 05.4 não contém este registro nem há commit próprio de 05.5 identificado nas fontes.

| Cenário | Avaliação recuperada |
| --- | --- |
| **S1 — planos segregados** | W e R têm quatro identidades e q3 por plano. A defesa Q53-B é condicional a uma geração fixa, vigente e autêntica de R, ao limite de uma identidade bizantina por plano nos horizontes aplicáveis e à custódia das chaves W até o corte autenticado em R e preservado de modo recuperável. A raiz externa, o cliente A3, a retenção e a disponibilidade são dependências materiais. |
| **S2 — organizações pareadas** | Quatro organizações, cada uma controlando Wᵢ e Rᵢ. A captura de três operadores aposentados de W que ainda conseguem assinar em R permite produzir um certificado q3 de R. A equivalência exige evidência de que a captura histórica de W preserva o orçamento de corrupção efetivo de R durante todo o horizonte de aceitação. |
| **S3 — transparência e âncoras** | Logs coassinados, checkpoints, leases e assinaturas evolutivas são alternativas de pesquisa. Continuidade relativa a um checkpoint não demonstra que o prefixo é o vigente. Equivalência depende de demonstrar atualidade, ordem de corte, bootstrap, defesa contra replay, retenção e recuperação sob a mesma ameaça. |

O adversário pode comprometer depois da aposentadoria operadores, administradores, chaves e acessos históricos de emergência de W. Backend, SQL e Auth podem estar comprometidos juntos. Oito identidades de voto não determinam a quantidade de organizações. A independência efetiva exige mapear operadores, administração, IdP/IAM, CI/CD, provedor e contas, KMS/HSM, backups e restauração, atualização do cliente, suporte, auditoria, incidentes e emergência. Uma credencial que controla duas identidades no mesmo plano já pode romper a hipótese f=1. A recuperação de R e da raiz externa precisa resistir à captura dos caminhos de W. Espelhos de bytes verificáveis podem contribuir para disponibilidade sob as guardas de autorização e P2, sem autoridade de decisão.

## Impacto na confirmação financeira

A ordem candidata da 05.4 avaliada na 05.5 é `RECONFIG decidido em W antiga → REF_CUT em R → instalação e ACTIVATE em W nova → REF_ACTIVATE em R`. Para confirmar uma leitura, o cliente confiável verifica a geração vigente de R autenticada externamente, o piso anterior, a continuidade W/R e uma `READ_BARRIER` decidida em W. A prova dessa barreira precede o desafio novo do `REF_CHECK` em R, vinculado à própria prova e ao mesmo contexto. O cliente valida todo o prefixo, dependências e envelopes e calcula o estado financeiro no ponto da barreira. O resultado tem esse ponto de referência, sem garantir verdade bancária externa ou atualização indefinida. E2EE e cálculo no cliente preservam a proibição de valores legíveis no servidor. [Checkpoint Security05.4](Q_RECONFIG.md#security054--autenticidade-histórica-e-continuidade-verificável)

`FETCH_HIST` dá ao learner acesso escopado a provas e envelopes históricos antes da promoção. `NOOP_R` permite reaprender uma decisão retida por prova de descendência sob as guardas da 05.4, sem colher assinatura nova de W aposentada. Restaurar só a chave e o último decide não recompõe votos e locks perdidos. WAL íntegro ou recuperação de estado demonstrada e fencing contra clones são condições para votar.

Cada plano precisa de q3. Uma identidade bizantina que retém o voto somada a uma honesta indisponível pode deixar apenas dois votos. Com quórum, provas, pisos ou dados insuficientes, P5 exige fail-closed. A experiência permitida se limita ao snapshot local previamente verificado e datado e a rascunhos cifrados não confirmados.

## Custos reportados e decisões pendentes

Os valores abaixo foram reportados como ilustrações da análise de 05/11/2026. A decisão de adoção exige dados operacionais e orçamento próprios.

| Hipótese reportada | Valor ilustrativo |
| --- | --- |
| Quatro W e quatro R a US$12 por VM por mês | US$48 para W + US$48 para R = US$96/mês |
| Quatro cópias de 1 TB a US$6,95 | US$27,80/mês. Subtotal exemplificativo com computação de US$123,80/mês |
| S3 com quatro W e arquivo de US$5 | US$53/mês antes de coassinantes ou autoridades, sem equivalência de segurança demonstrada |
| Faixa humana e operacional total ilustrada para S1/S2 | US$3.323,80–US$35.123,80/mês |
| Quatro HSMs dedicados a US$1,60/h por 730h | US$4.672/mês adicionais para R no cenário hipotético |

As premissas humanas reportadas foram 40–120 h/mês de operação, monitoramento e incidentes, 8–32 h/mês para A3, 8–24 h/trimestre para recuperação, 80–240 h/ano de auditoria e até 40 h/mês de suporte. As taxas de cenário foram US$50–150/h de operação e US$100–250/h de auditoria. TCO, latência, SLA e custos de uma raiz externa continuam `NOT_PROVEN`. A tabela identifica hipóteses do relato, sem cotação atual ou orçamento aprovado.

Seguem para decisão do CEO a raiz externa, seus custódios e limiares, o horizonte e o orçamento cumulativo de comprometimento, os operadores e níveis de disponibilidade, a política de perda catastrófica sem reset silencioso, a autorização P2 campo a campo e, após evidência técnica e operacional, eventual adoção de S1.

## Proveniência e comparação com os registros encontrados

Os três insumos abaixo foram lidos integralmente e identificados pelos SHA-256 dos bytes recebidos no diretório Downloads. O dossiê e os dois documentos específicos reconstituem relatos transmitidos pelo CEO. Os hashes identificam esses insumos e não permitem inferir os bytes, hashes ou logs dos oito arquivos locais mencionados no relato de 05.6.

| Insumo recebido | SHA-256 | Uso nesta autoria |
| --- | --- | --- |
| `BETER_LIFE_RECONSTRUCAO_SECURITY05_5_05_6_2026-11-09.md` | `85E2BDD4D8D196FEE455FF0194B6C82ADE73175E34641110EB54FF292F14BDB5` | Baselines, resumo das duas rodadas, achados reportados e limites de recuperação |
| `BETER_LIFE_SECURITY05_5_DECISAO_RECONSTRUIDA.md` | `4295BD435BE14A67F36F203C0966367FC576CB06C06179E5656C29C204CEBEB6` | Decisão executiva, ameaça, condições de S1/S2/S3, sequência W/R e custos históricos |
| `BETER_LIFE_SECURITY05_6_ESPECIFICACAO_RECONSTRUIDA.md` | `FC666E91BB81C5F9CD3DA36A287988F03DC62EB5DEE7856DDDDE21CDB35A887F` | Autoridade C, sequência candidata, bootstrap e achados Q56-A–E |

O pedido primário de reconstrução do CEO (`Texto colado.txt`, SHA-256 `0EF309578D3CDE2F21DD25C8A1B6762BF6B75F453E814EDAF938166B4C307702`) define escopo e critérios da rodada. O Back publicado é `codex/security05-documental-checkpoint@86e7018e39799072005fced68fce6da2c392bb3f`, com 18 arquivos rastreados em `poc/security05/`, quatro deles em `sources/`, e registros de 05.2, 05.3 e 05.4. O Front publicado é `codex/agent-team-design-skills@8c8c4f548023aadce4da1aadb0afe2778db0c455`. Os blobs da política compartilhada, do checkpoint da equipe e dos oito perfis de agentes coincidem nas duas referências. Os checkouts MDL13 tinham trabalho local e a autoria ocorreu somente no worktree Back isolado sobre o checkpoint. [Checkpoint Back](https://github.com/beter-life/Back/tree/86e7018e39799072005fced68fce6da2c392bb3f/poc/security05) · [Checkpoint Front](https://github.com/beter-life/Front/tree/8c8c4f548023aadce4da1aadb0afe2778db0c455)

O worktree isolado já continha dois registros rastreados modificados, [GATE_RESULT.md](GATE_RESULT.md) e [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md), e [R_TRUST_ROOT.md](R_TRUST_ROOT.md) fora do índice. O SHA-256 observado de `R_TRUST_ROOT.md`, `AB2BDA4EB62F7B287F26105C5FB87B3F1376B1DFA53283E74F62CF864C7E681A`, coincide com o que a rechecagem local atribui a esse candidato. O relato recuperado e o registro local convergem em S1, na captura administrativa histórica de W e no requisito de raiz independente. Divergem no candidato de rollover e no significado dos achados:

| Registro de 05.6 | Desenho e uso do parecer |
| --- | --- |
| **Variante local E/K/T** | E é provisionamento externo, K é raiz offline q3/4 e T é evidência independente de tempo. Concessões com janelas exclusivas, `REF_TERMINAL` e `R_OPEN` delimitam a troca. O parecer registra dez traços. Seus Q56-A/B/C tratam de pins T restaurados, tempo no ato efetivo e predicado de abertura/terminal por ramo, respectivamente. A rechecagem é identificável para o candidato E/K/T. |
| **Variante C relatada pelo CEO** | C atesta vigência em relação à prova consultada, com C4/C7 indecisos e sequência `C_BEGIN → R_SEAL → C_PREPARE → R_INSTALL/R_START → C_FINAL`. O dossiê relata onze cenários e classifica o parecer original como documentalmente revisado, com Q56-A de circularidade ainda aberto. Q56-B–E tratam do horizonte e comprometimento cumulativo de C, perda de R entre início e selo, P2/A3 e mecanismos operacionais. [Adendo reconstruído](Q_RECONFIG.md#security056--autoridade-externa-c-reconstrução-documental) |

Os mesmos rótulos identificam achados diferentes nesses dois registros. O material disponível não estabelece a relação cronológica entre as variantes nem dá acesso à íntegra, aos logs ou aos hashes dos oito adendos C relatados. O parecer histórico reportado e o parecer local E/K/T têm escopos próprios. Esta autoria genérica aplica integralmente o perfil nominal `arquiteto-seguranca` e aguarda nova revisão em instância separada, sobre os hashes dos documentos efetivamente redigidos. O perfil é uma instrução operacional, com restrições por papel `NOT_ENFORCED`.

**Classificação:** `Q-RECONFIG OPEN/P1`. Proteção histórica, composição, segurança operacional e TCO `NOT_PROVEN`. Ensaios `NOT_RUN`. Security06, MDL13 e MDL14 `BLOCKED`.
