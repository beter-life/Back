# Security05.2 — encerramento documental

A revisão adversarial independente foi concluída em **04/11/2026** pelo `dev-seguranca`, após o encerramento do refinamento pelo `arquiteto-seguranca`. O [parecer vigente](INDEPENDENT_REVIEW.md) registra **`DOCUMENTATION_REVIEWED_NOT_APPROVED`**. A autoridade da rodada é o pedido do CEO Security05.2, identificado por hash em [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). A consolidação final é exclusivamente documental e se baseia no commit de transferência `c9d3e2cfdf3d4a0d6361eb8924fe7e6cb72fee1c`.

## Estado inicial e preservação

No início da rodada, o estado era `REVISION_PENDING_INDEPENDENT_REVIEW`. O Back estava em `codex/security05-protocols`, no baseline `22ee3b0b959832b1293e37eef217d926a40db3e6`, com um worktree, 13 documentos autorais modificados sem staging e quatro fontes históricas originais preservadas. O Front estava em `codex/agent-team-design-skills`, no commit `8c8c4f548023aadce4da1aadb0afe2778db0c455`, com um worktree limpo. A política compartilhada, o checkpoint e os oito perfis comuns coincidiam.

O arquiteto refinou os dez documentos planejados e o revisor registrou o parecer em `INDEPENDENT_REVIEW.md` em sequência. O commit de transferência, filho direto do baseline, reuniu as alterações dos 13 documentos autorais e preservou as quatro fontes históricas. Os estados de revisão pendente nos documentos técnicos publicados pertencem à preparação da rodada. Este registro consolida o resultado efetivo.

## Decisões aprovadas e alcance técnico

O CEO selecionou quatro testemunhas independentes/q3/HotStuff com até uma bizantina e comprometimento conjunto adicional de backend/SQL/Auth. A1 é referência pessoal complementar, sem serializar obrigatoriamente transações ou dispensar consenso. Selecionou também fator U aleatório32B na recuperação cumulativa Shamir3-de-5 + U, HKDF-SHA256/AES256GCM, e quatro domínios operacionais. A aprovação é de direção arquitetural, não de refinamento formal, execução experimental ou produção.

Refinamento deve explicitar consenso entre views, pacemaker, durabilidade, reconfiguração, admissão de novos clientes, restauração antiga e leitura com provas. Qualquer adaptação de HotStuff publicado precisa de identificação e obrigação de prova; não afirmar que três assinaturas ou assinatura antiga bastam. A1 não pode voltar silenciosamente ao papel de autoridade serializadora.

R35 precisa de formatos, contexto, nonces, versões, rotação, kit autenticado, independência do fator após perda de dispositivo e fluxo de recuperação/UX. Três partes sem U, U sem três partes, login/reset/Auth ou backups conjuntos não podem ser atalhos de recuperação. Recuperação de chaves não comprova atualidade; perda definitiva de U é risco explícito.

A3 deve tratar bootstrap de confiança fora do backend, assinaturas e versões de artefatos, atualização/anti-downgrade, rotação/revogação e comprometimento de distribuição. HTTPS/CSP ou assinatura isolada não demonstram todo o sistema. Se não há solução demonstrável, a distribuição permanece bloqueio técnico.

O36 deve separar quatro operadores/domínios em credenciais, chaves, infraestrutura, administração e incidentes, incluindo falhas de fornecedor/IdP/CI comuns e recuperação de desastre. Quatro VMs do mesmo operador não são quatro domínios independentes. Custos são separados por categoria e por cenário; tarifas públicas não são contratos, dimensionamento demonstrado ou orçamento/SLA aprovado.

## Resultado da revisão independente

- **F03** foi corrigido e rechecado documentalmente. O manifesto `M0` permanece imutável. Se o uso de material criptográfico for incerto ou `M0` precisar mudar, o conjunto incompleto é abandonado por inteiro, evitando reutilizar KEK/IV com AAD alterado.
- **F04** foi corrigido e rechecado documentalmente. O artefato ou manifesto verificado cobre todo código ativo, dependências e pontes com acesso a dados legíveis ou material criptográfico. O backend fornece dados não executáveis para esse contexto.

## Bloqueios remanescentes

| Achado | Estado e pendência |
| --- | --- |
| `Q-RECONFIG` | **`OPEN/P1`**. No contraexemplo analítico, uma testemunha honesta persiste `FREEZE_VOTED` sem que o `FREEZE` seja decidido. Em outra view, um ramo incompatível pode ser decidido, mas a testemunha congelada fica impedida de votar nele. Se a bizantina retiver seus votos, restam duas honestas disponíveis, abaixo do quórum de três, mesmo após a rede se recuperar. A adaptação `FREEZE–INSTALL–ACTIVATE` segue bloqueada para aprovação técnica até demonstrar segurança e progresso ou ser submetida à deliberação do CEO sobre a parte dependente. |
| `Q-PACE` | Aberto. Especificar avanço e sincronização entre views, relógios e limites, preservando os locks e demonstrando progresso após o sincronismo da rede. |
| `Q-RECOVER` | Aberto. Demonstrar recuperação íntegra de votos e locks e impedir voto por réplicas restauradas de backups antigos ou por clones, ou especificar substituição segura. |
| `Q-BOOT/FRESH` | Aberto. Sustentar o bootstrap e a atualidade após perda das referências recentes e explicitar o modelo de comprometimento de chaves de épocas anteriores. |
| `A3-BOOT/STATE` | Aberto. Demonstrar bootstrap externo, estado e tempo resistentes a rollback e tratamento de revogação e comprometimento por plataforma. |
| `R35-COMP/OPS` | `NOT_PROVEN`. Faltam evidências de composição, interoperabilidade, custódia, backups, rotação e recuperação com o fator independente. |
| `O36` | `NOT_PROVEN`. Faltam comprovação de independência operacional, operadores, capacidade, custos totais, SLA e plano de auditoria. |
| Metadados `P2` | Pendente. Inventariar campos e inferências e submeter a exposição residual à autorização específica. |
| Paridade financeira integral | `NOT_PROVEN`. Faltam fontes detalhadas e vetores independentes. Os originais técnicos Security02–Security04 seguem ausentes e o handoff é fonte secundária. |

Segurança experimental, segurança operacional, prova de refinamento, desempenho, distribuição confiável e configuração integral efetiva permanecem `NOT_PROVEN`. Ensaios permanecem `NOT_RUN`. Os critérios falsificáveis de [SECURITY_GATE_CRITERIA.md](SECURITY_GATE_CRITERIA.md) ficam registrados para uma eventual etapa com autorização específica.

## Encerramento

O gate documental encerra com `DOCUMENTATION_REVIEWED_NOT_APPROVED`. Implementação, PoC, migrations e Security06 seguem sem autorização. MDL13 e MDL14 continuam `BLOCKED`.

Para uma eventual Security05.3, recomenda-se ao CEO autorizar um gate documental focado em `Q-RECONFIG`. O primeiro passo seria especificar um refinamento ou uma transição publicada compatível com a direção aprovada, demonstrar segurança e progresso diante do `FREEZE` parcial e submeter a mudança material à revisão independente. A decisão sobre a abertura desse gate cabe ao CEO.

---

# Security05.3 — encerramento documental de Q-RECONFIG

Em **05/11/2026**, o `dev-seguranca` concluiu a [revisão adversarial](INDEPENDENT_REVIEW.md#security053--parecer-adversarial-independente-de-05112026) depois da autoria pelo `arquiteto-seguranca`. Após uma correção localizada, o revisor [rechecou o candidato](INDEPENDENT_REVIEW.md#rechecagem-independente-do-candidato-revisado--05112026), SHA-256 `6E47E4C87D6DAFFC792A4ADF0BF0BBD1AD9E94ED85FF1A93C0585E7F44D6836A`. Resultado **`DOCUMENTATION_REVIEWED_NOT_APPROVED`**. **`Q-RECONFIG` permanece `OPEN/P1`** para aprovação técnica.

## Candidato e alcance do resultado

O [candidato documental](Q_RECONFIG.md) conserva o Basic HotStuff por época e define o corte no primeiro `RECONFIG` válido coberto por uma `commitQC` antiga. Votos parciais preservam os locks normais e a participação em views posteriores. Após o corte, o ramo antigo admite somente `PAD_E` sem efeito. A ativação vincula o histórico decidido a um genesis canônico, instalação verificável e decisão por quórum no novo conjunto. A comparação com DynaNet/D-HotStuff, Dyno e o refinamento do FREEZE anterior está na [análise de alternativas](Q_RECONFIG.md#2-alternativas-investigadas).

A revisão confirmou, sob as hipóteses declaradas, a correção do traço de 05.2. Para o candidato, o argumento de safety combina finalização comparável no conjunto antigo, corte único e continuidade verificável do genesis novo. O argumento de liveness distingue recuperação da prova já conhecida por uma testemunha e nova decisão sobre um descendente sem efeito quando o líder retém a prova original. Requer três testemunhas honestas disponíveis na etapa pertinente, provas e bytes alcançáveis e uma view comum com líder correto após GST. Antes de haver prova antiga acessível, dois votos disponíveis não formam quórum.

| Dimensão | Encerramento |
| --- | --- |
| Contraexemplo original | Correção documental confirmada condicionalmente para o traço de FREEZE parcial. |
| Q53-A | Corrigido e rechecado no texto. Uma regra por ramo dá precedência a `PAD_E` após `RECONFIG` e exige prova de ativação de ancestral estrito para os comandos seguintes da nova época. |
| Q53-B | O ataque com chaves aposentadas e a condição fail-closed foram especificados e rechecados. A proteção histórica segue `NOT_PROVEN`. |
| Refinamento formal | `NOT_PROVEN`. Faltam composição da máquina entre épocas, persistência e recuperação monotônicas, sincronização de views e demonstração de disponibilidade de provas e dados. |
| Validação experimental | `NOT_RUN`. Os casos falsificáveis da especificação e do parecer ficam para eventual gate autorizado. |
| Segurança operacional | `NOT_PROVEN`. Permanecem pendentes fencing, retenção independente, bootstrap e atualidade, autoridade e custódia de configuração, metadados P2 e independência dos quatro domínios. |

## Estado Git e decisão seguinte

A rodada começou no worktree isolado em HEAD destacado no commit `c9d3e2cfdf3d4a0d6361eb8924fe7e6cb72fee1c`, com apenas o fechamento 05.2 acima fora do staging. O SHA-256 desse registro inicial era `26011A903B002555CC2974BEEF1DD803DB7684176ED2509E14751028227844CC`. O HEAD final é o mesmo. O delta desta rodada consiste neste encerramento, no novo candidato, no parecer independente com rechecagem e nas referências em sincronização e critérios. O fechamento 05.2 e o histórico das revisões foram preservados.

Recomenda-se submeter ao CEO o refinamento e as obrigações de prova registradas, com prioridade para autenticação histórica e disponibilidade das provas e dos dados. A abertura de novo gate depende de decisão do CEO. Implementação, PoC, model-checking, migrations e Security06 seguem sem autorização. MDL13 e MDL14 continuam `BLOCKED`.

---

# Security05.4 — encerramento documental de autenticidade histórica

Em **05/11/2026**, o `dev-seguranca` concluiu a [revisão adversarial](INDEPENDENT_REVIEW.md#security054--parecer-adversarial-independente-de-05112026) após a autoria pelo `arquiteto-seguranca`. A [rechecagem independente](INDEPENDENT_REVIEW.md#rechecagem-independente-do-candidato-revisado--security054) examinou o candidato revisado, SHA-256 `D4BF40ECCA48AAC06E1F7401D76A4227ECDF2E7F4442287CA15C0A1D3AE0D7CD`. Resultado **`DOCUMENTATION_REVIEWED_NOT_APPROVED`**. Q53-B tem defesa condicional e proteção histórica `NOT_PROVEN`. **`Q-RECONFIG` permanece `OPEN/P1`**.

## Candidato e fronteiras da defesa

O [candidato 05.4](Q_RECONFIG.md#security054--autenticidade-histórica-e-continuidade-verificável) mantém o corte por `RECONFIG` efetivamente decidido em W e propõe um registro BFT independente R com quórum 3-de-4. R autentica e registra o corte como `PENDING` antes da liberação da custódia das chaves antigas. Isso exige prova final verificável e recuperabilidade independente de suas dependências. `REF_ACTIVATE` vincula a sucessora ao corte e à ativação decidida no novo conjunto de W.

Para confirmar um saldo, o cliente precisa de uma raiz externa e uma geração de R vigentes, extensão dos pisos confiáveis, `READ_BARRIER` decidida por W e `REF_CHECK` posterior vinculado à prova e a novo desafio. Precisa também materializar e validar o prefixo financeiro completo. A leitura vale no ponto da barreira. A1 continua referência complementar, A3 autentica a distribuição do cliente, e um backup íntegro ou recuperação de chaves serve de evidência histórica quando falta prova atual. Sem referência recente independente ou proteção histórica suficiente, as execuções genuína e fraudulenta podem ser indistinguíveis. O cliente bloqueia confirmação atual e promoção dependente.

## Parecer e condições pendentes

| Dimensão | Resultado da revisão e rechecagem |
| --- | --- |
| Q53-B | Defesa condicional na mesma geração fixa, vigente e historicamente autêntica de R, com custódia de W até a fronteira demonstrada. Proteção histórica `NOT_PROVEN`. |
| Q54-A | Escopo delimitado. Consulta anterior e manifesto antigo são insuficientes durante a troca de geração de R. Encerramento, transferência das âncoras W e comprovação da vigência na posição da consulta seguem `NOT_PROVEN`. |
| Q54-B | `NOOP_R` especificado e rechecado para recuperar decisão retida por prova de ancestralidade, sem comando de cliente. Progresso depende de q3, view comum, locks e dados disponíveis. |
| Q54-C | Acesso histórico `FETCH_HIST` e elegibilidade `PROMOTE` foram separados. A promoção requer revalidação após materialização e vale na posição decidida. Fencing, revogação e recuperação após rollback continuam abertos. |
| Refinamento formal e operação | `NOT_PROVEN`. Demonstrar composição W/R, Q-PACE, Q-RECOVER, disponibilidade de provas e envelopes, raiz externa, custódia, independência de operadores e proteção dos metadados P2. |
| Validação experimental | `NOT_RUN`. Os [casos falsificáveis e obrigações de prova](Q_RECONFIG.md#0548-critérios-futuros-e-classificação) ficam registrados para eventual gate autorizado. |

## Estado Git e próximo gate

O worktree isolado começou e terminou com HEAD destacado em `c9d3e2cfdf3d4a0d6361eb8924fe7e6cb72fee1c`, com os mesmos quatro caminhos modificados e `Q_RECONFIG.md` fora do índice. A 05.4 acrescentou o candidato, o parecer, a rechecagem e este encerramento aos documentos existentes, além dos ponteiros de sincronização e critérios. Os prefixos 05.3 do candidato, dos pareceres e deste registro foram preservados.

Recomenda-se submeter ao CEO a hipótese externa de confiança e disponibilidade em R antes de aprofundar a composição W/R. A troca de geração de R, a retenção auditável de provas e envelopes e as obrigações de Q-PACE/Q-RECOVER continuam pendentes. Implementação, PoC, model-checking, migrations e Security06 seguem sem autorização. MDL13 e MDL14 continuam `BLOCKED`.

---

# Security05.5 e Security05.6 — encerramento da reconstrução documental

Em 09/11/2026, a reconstrução a partir dos relatórios do CEO recebeu **`DOCUMENTATION_REVIEWED_NOT_APPROVED`** após nova revisão independente. O parecer cobre a fidelidade dos documentos recriados às fontes recebidas. A equivalência aos oito adendos originais relatados, seus hashes e os logs históricos seguem sem comprovação. A [proveniência e os hashes dos três insumos](SECURITY05_5_RECONSTRUCTION.md#proveniência-e-comparação-com-os-registros-encontrados) distinguem o relato recuperado dos arquivos verificáveis neste ambiente.

O Back publicado em `codex/security05-documental-checkpoint@86e7018e39799072005fced68fce6da2c392bb3f` contém os registros até a 05.4 e as quatro fontes históricas. O Front publicado está em `codex/agent-team-design-skills@8c8c4f548023aadce4da1aadb0afe2778db0c455`. Os checkouts principais estavam em MDL13, Back `c3f975c3514173c47c4c1fd08affb64305f1efe7` e Front `1ca91f6ab6da2082ed1f041fe7a688bb2f23390d`, com alterações locais preservadas. A reconstrução usou o worktree isolado existente do Back no mesmo HEAD, com índice vazio.

## Conteúdo reconstruído e diferenças verificadas

- **05.5** recupera S1 como referência de investigação, a captura posterior de operadores e acessos administrativos de W e a avaliação condicional de S2/S3. As oito identidades de W/R não determinam oito organizações. Os custos são ilustrações históricas e seguem sem orçamento ou TCO comprovados. [Decisão executiva reconstruída](SECURITY05_5_RECONSTRUCTION.md)
- **05.6, variante C** acrescenta uma autoridade candidata externa ao mecanismo da 05.4 para autenticar a geração vigente de R. `C4` e `C7` são alternativas pendentes. A sequência relatada é `C_BEGIN → R_SEAL → C_PREPARE → R_INSTALL/R_START → C_FINAL`. O adendo explicita guardas, evidências e condições de parada como obrigações de refinamento. E2EE, W 4/q3, R independente como candidato, A1 complementar, A3 independente, Shamir 3-de-5 com U e fail-closed seguem como fronteiras. [Especificação reconstruída](Q_RECONFIG.md#security056--autoridade-externa-c-reconstrução-documental)
- **Variante local E/K/T** foi encontrada antes da autoria em `R_TRUST_ROOT.md` e nos adendos anteriores deste arquivo e do parecer. Seus Q56-A/B/C tratam de fontes de tempo restauradas, tempo no ato efetivo e abertura de R. Os Q56-A–E da variante C designam outros achados. Os conteúdos anteriores foram preservados e nenhum parecer foi transferido entre variantes.

## Revisão, estado e próximo ponto de decisão

Duas instâncias genéricas distintas atuaram em sequência, com os perfis integrais nominais `arquiteto-seguranca` e `dev-seguranca`. O runtime disponível não expôs `agent_type`. A separação entre instâncias foi observada e o enforcement das restrições por papel permanece `NOT_ENFORCED`. O [novo parecer](INDEPENDENT_REVIEW.md) identifica pelos hashes o registro 05.5 e o adendo C que foram efetivamente revisados.

Q56-A–E da variante C permanecem **abertos**. A revisão também registrou que uma R aposentada comprometida pode forjar um recibo com posição numericamente anterior ao selo, que um limiar de assinaturas sem decisão ordenada admite conflitos e que a transferência incompleta pode perder `PENDING`. A aceitação precisa demonstrar ancestralidade ao terminal e contexto da consulta. Perda definitiva de quórum ou evidência pode bloquear o progresso.

| Dimensão | Estado |
| --- | --- |
| Reconstrução documental | `RECONSTRUCTED_FROM_CEO_REPORT_2026-11-09` |
| Nova revisão documental | `DOCUMENTATION_REVIEWED_NOT_APPROVED` quanto à fidelidade às fontes recuperadas |
| Refinamento formal, proteção histórica e segurança operacional | `NOT_PROVEN`. `Q-RECONFIG OPEN/P1`. |
| Validação experimental | `NOT_RUN`. |

No início havia `GATE_RESULT.md` e `INDEPENDENT_REVIEW.md` modificados e `R_TRUST_ROOT.md` fora do índice. Ao final, o worktree conserva o mesmo HEAD e acrescenta o registro 05.5, o adendo de `Q_RECONFIG.md`, o novo parecer e este encerramento, todos fora do staging. As quatro fontes históricas, a variante local e os prefixos preexistentes foram preservados.

Para uma eventual 05.7, recomenda-se ao CEO autorizar o refinamento documental de Q56-A, separando identidade de intenção, provas por etapa e finalização. A prova deve cobrir canonicalização, domínio, replay, transições concorrentes, crash, ancestralidade ao selo e perda de quórum. A abertura da etapa cabe ao CEO. Security06, MDL13 e MDL14 continuam bloqueados.


# Security05.7 — identidade da transição C e autenticidade de REF_CHECK

**DOCUMENTATION_REVIEWED_NOT_APPROVED · Q-RECONFIG OPEN/P1.** Gate documental sobre a variante C reconstruída, com Q56-A e o verificador histórico delimitados no [parecer independente](INDEPENDENT_REVIEW.md#security057--parecer-adversarial-independente-da-variante-c).

## Baseline e preservação

A referência publicada Back `codex/security05-recovery-reviewed` é `c4d71d5b70d6df50a8553084bf212a22ba47a6ac`, filho de `86e7018e39799072005fced68fce6da2c392bb3f`. O trabalho ocorre em um único worktree local separado, `.harness/tmp/security05.7-c-refinement`, inicialmente limpo em detached HEAD no commit publicado. A referência Front `codex/agent-team-design-skills` confere com `8c8c4f548023aadce4da1aadb0afe2778db0c455`. Os checkouts MDL13, a política BL-TEAM-1, os oito perfis, as quatro fontes históricas e o material local E/K/T foram preservados. A proveniência é `RECONSTRUCTED_FROM_CEO_REPORT_2026-11-09`, com correspondência aos originais ainda indeterminada. A autoria e a revisão usaram os perfis integrais em duas instâncias genéricas sequenciais, conforme a exceção da autorização do CEO para runtime sem `agent_type`. Controles por papel seguem NOT_ENFORCED.

## Resultado documental

A [identidade e o grafo](Q_RECONFIG.md#0573-máquina-de-transição-e-dependências) fixam `t = id(INTENT)` antes dos votos, com domínio, contextos de C/R, predecessor decidido, nova geração, roster e política. O encadeamento é `C_BEGIN → R_SEAL → C_PREPARE → R_GENESIS/INSTALL → R_START → C_FINAL → R_ENABLE`. O selo compromete o tamanho, a raiz e o nó pai do prefixo anterior à sua própria folha. As decisões e seus anexos carregam prova verificável em cada etapa. A guarda de fase e predecessor restringe a reserva a uma sucessora decidida. O registro durável anterior ao voto e a divulgação idempotente dos fatos decididos são hipóteses do desenho. Quando o selo genuíno nunca foi produzido e se perde definitivamente o quórum de R antiga, a transição fica bloqueada.

O [verificador histórico](Q_RECONFIG.md#0574-ref_check-decidido-selo-e-vigência) autentica em C o terminal exato de R e verifica os bytes do comando e do resultado, a inclusão de sua folha e a cadeia de pais até o selo. O contraexemplo com três chaves aposentadas, prefixo comum anterior e recibo forjado na posição 99 diante de um selo na posição 100 falha se o terminal genuíno continua autenticável. Vigência exige desafio fresco e `C_LIVE_CHECK` ordenado, sujeito à cerca, aos pisos monotônicos e à revalidação dos dados cifrados no cliente. Recibos genuínos da R antiga recebidos após C_FINAL podem continuar verificáveis como históricos.

A [rechecagem independente](INDEPENDENT_REVIEW.md#rechecagem-independente-do-candidato-corrigido--security057), concluída em 09/11/2026, confirmou a correção documental localizada de **Q56-A, Q57-1 e Q57-2** no candidato de SHA-256 `14e967224a98f80e8f7d4c50eaa65994c5817d90c6c66d0ddd2fd3ce7a8af396`. Q57-1 exige autorização de elegibilidade sob política pré-ancorada, separada de ADMIT e vinculada à intenção, ao roster, à política de destino e à evidência exatos. Q57-2 exige validar o decisor, o caminho e os anexos efetivos sem dependência circular e autenticar o compromisso de C antes de revalidar R no modo histórico. A defesa contra REF_CHECK fora do prefixo recebe parecer documental favorável sob terminal C genuíno e autenticado. Esse parecer cobre o recorte e o hash examinados. A disponibilidade dos testemunhos, o horizonte de confiança e a independência operacional exigidos continuam por demonstrar.

## Bloqueios e decisão executiva

Q56-B, Q56-C, Q56-D e Q56-E seguem abertos. Q-PACE, Q-RECOVER, Q-BOOT/FRESH, A3-BOOT/STATE, P2, interoperabilidade W/R/C, custódia, disponibilidade independente, horizonte de C e suas próprias sucessões continuam dependências. Preservam-se E2EE, W 4/q3, R 4/q3 como candidata, recuperação Shamir 3-de-5 com U independente, A1 complementar, A3 verificável, P5 fail-closed, P6 independência operacional e S1 como referência de investigação. Proteção histórica, segurança operacional, refinamento formal e progresso composto permanecem NOT_PROVEN. Validação experimental permanece NOT_RUN. Security06, MDL13 e MDL14 seguem BLOCKED.

C4 é a referência para dimensionar o menor esforço operacional. C7 eleva a interseção mínima de dois para três e o limite nominal de uma para duas falhas bizantinas sob domínios efetivamente independentes. Exige cinco votantes disponíveis, mais custódia e administração. Ambas seguem pendentes de evidência de controles, corrupção cumulativa, disponibilidade, custo, sucessão e recuperação catastrófica. TCO e SLA permanecem NOT_PROVEN. A decisão sobre topologia, operadores, autoridade de admissão, horizonte e reancoragem cabe ao CEO. [Comparação C4/C7](Q_RECONFIG.md#0577-c4c7-e-critérios-para-uma-decisão-posterior)

Recomenda-se, mediante nova decisão do CEO, delimitar um gate documental de custódia e horizonte de C, elegibilidade e revogação, retenção e reancoragem, com obrigações verificáveis de composição W/R/C e critérios de disponibilidade e custo para C4/C7. Até nova autorização, o ponto de retomada é este snapshot local revisado.

O HEAD permanece `c4d71d5b70d6df50a8553084bf212a22ba47a6ac` em detached HEAD. Somente `Q_RECONFIG.md`, `INDEPENDENT_REVIEW.md` e este registro têm adendos locais. A preparação no índice está vazia. Implementação, PoC, model-checking, migrations, commits, publicação e início de outro gate permanecem fora da autorização.


# Security05.8 — horizonte de confiança, recuperação catastrófica e composição W/R/C

**DOCUMENTATION_REVIEWED_NOT_APPROVED · Q-RECONFIG OPEN/P1.** Gate documental da variante C sobre Q56-B–E. A referência Back publicada é `codex/security05-7-reviewed@95801cba5ca9f5921a3acb4a28b87c7b43eb9074`. A referência Front é `codex/agent-team-design-skills@8c8c4f548023aadce4da1aadb0afe2778db0c455`. Ambos os origins foram conferidos. BL-TEAM-1, os oito perfis, os checkouts MDL13, o worktree Security05.7, o material local E/K/T e as quatro fontes históricas foram preservados. A proveniência `RECONSTRUCTED_FROM_CEO_REPORT_2026-11-09` permanece com correspondência aos originais indeterminada.

## Resultado e rechecagem independente

O [modelo de horizonte](Q_RECONFIG.md#0581-q56-b--capacidades-efetivas-horizonte-e-sucessão-de-c) separa corrupção simultânea de capacidades cumulativas por contexto e cliente. C4 perde a garantia de interseção honesta com duas capacidades e admite QC autônoma com três. Em C7 os limiares são três e cinco. A janela depende de referências autenticadas e monotônicas, proteção efetiva durante todo o período de aceitação, extensão de pisos e tratamento de clientes offline e restaurados. Rotação e assinaturas forward-secure seguem candidatas, com condições próprias de custódia e de exclusão de cópias antigas utilizáveis.

A [matriz de recuperação](Q_RECONFIG.md#0582-q56-c--fronteiras-de-recuperação-e-impossibilidade) distingue A, reaprender fato genuíno recuperável, B, produzir nova decisão com a retomada do quórum exato, e C, evidência insuficiente para demonstrar continuidade. Perder definitivamente R antiga antes de um selo genuíno recuperável pode impedir continuidade. Depois de FINAL, R pode habilitar tecnicamente se a prova e o status aplicável ainda forem admissíveis, enquanto a confirmação financeira segue sujeita a LIVE. A recuperação P4 dá acesso ao material de leitura dos envelopes disponíveis no cliente. A vigência e a continuidade conservam requisitos próprios.

A [matriz W/R/C](Q_RECONFIG.md#0583-composição-wrc--invariantes-e-dependências) apresenta treze invariantes com mecanismos, hipóteses, contraexemplos, evidências e critérios falsificáveis. Q-PACE, Q-RECOVER, Q-BOOT/FRESH e A3-BOOT/STATE têm obrigações distintas. O inventário P2 inclui vínculos entre os planos pelos anexos das provas, tráfego, acesso a arquivos, backups e suporte. Uma release A3 maliciosa validamente distribuída pode ler dados no cliente apesar de provas W/R/C genuínas. Os critérios de Q56-E exigem evidência de controle efetivo de IdP, CI/CD, custódia, backup, suporte, WAL, clones e retenção.

O [parecer adversarial](INDEPENDENT_REVIEW.md#security058--parecer-adversarial-independente) cobriu os treze cenários de ataque da missão. A [rechecagem independente](INDEPENDENT_REVIEW.md#rechecagem-independente-do-candidato-corrigido--security058) confirmou as correções documentais de **Q58-1 e Q58-2** sobre o candidato de SHA-256 `c9382ae027f1bb1828a140ca24db7069e552c60738744ad24c921985597596d9`. Q58-1 exige evidência independente da decisão e do fechamento genuíno para afirmar continuidade após perda de confiança. Q58-2 bloqueia os avanços afetados por perda ou incerteza de elegibilidade após BEGIN, preservando reserva, cerca, custódia e fatos autenticáveis. Os mecanismos concretos de reancoragem e ordenação de status seguem abertos. As correções documentais da 05.7 mantêm o alcance publicado, inclusive a ancestralidade de REF_CHECK condicionada ao terminal genuíno autenticado por C.

| Classificação | Alcance |
| --- | --- |
| `POLICY_APPROVED` | P1–P6 preservados. E2EE e cálculo financeiro no cliente, Shamir 3-de-5 com U independente de 32 bytes, W 4/q3, P5 e independência operacional seguem obrigatórios. A1 é complementar, A3 verificável e S1 referência de investigação. |
| `DOCUMENTED` | Modelo temporal, fronteiras de recuperação, obrigações compostas, inventário P2/A3, controles Q56-E, comparação de arquiteturas e cenários de custo. R 4/q3 permanece candidata. |
| `DOCUMENTATION_REVIEWED` | Parecer e rechecagem vinculados a snapshots exatos. Q58-1 e Q58-2 corrigidos no recorte documental. |
| `NOT_PROVEN` | Q56-B–E, horizonte e sucessão C, proteção histórica integral, status e custódia efetivos, refinamento formal, progresso composto, segurança operacional, privacidade residual, independência, TCO e SLA. |
| `NOT_RUN` | Validação experimental, PoC, model-checking e exercícios operacionais. |
| `BLOCKED` | Q-RECONFIG segue OPEN/P1. Security06, MDL13 e MDL14 permanecem bloqueados. Implementação, migrations, infraestrutura, contratação e deploy seguem fora deste gate. |

## Decisões pendentes do CEO

Usar C4 como referência de dimensionamento. Avaliar C7 sob a mesma ameaça quando houver evidência de sete domínios efetivos, benefício material da segunda falha tolerada e disponibilidade sustentável de cinco votantes aptos. O [cenário ilustrativo](Q_RECONFIG.md#0586-c4-c7-e-alternativas-sob-a-mesma-ameaça) soma US$ 199,60/mês para C4 e US$ 256,45/mês para C7 em computação e arquivo, usando premissas históricas e quantidades hipotéticas. Custódia, horas humanas, auditoria, suporte, A3, tráfego, retenção real e recuperação exigem cotações e evidência próprias. Logs testemunhados, carimbos de tempo, atualização autenticada e assinaturas evolutivas atendem funções parciais. A equivalência de uma substituição de R/C permanece por demonstrar.

Para um próximo gate documental, mediante autorização do CEO, recomenda-se fixar requisitos de fonte externa, tempo e pisos por plataforma, revogação e sucessão, reancoragem e tratamento de ruptura, limites P2, retenção e independência comprovável. Essas escolhas antecedem a especificação do verificador e a demonstração da composição W/R/C. Seleção entre C4 e C7, autoridade externa, operadores, custodiantes e orçamento seguem pendentes.

O worktree `.harness/tmp/security05.8-trust-horizon` começou limpo em detached HEAD `95801cba5ca9f5921a3acb4a28b87c7b43eb9074` e termina no mesmo HEAD, com adendos locais somente em `Q_RECONFIG.md`, `INDEPENDENT_REVIEW.md` e `GATE_RESULT.md`. O índice está vazio. Autoria e revisão usaram os perfis integrais em duas instâncias genéricas sequenciais pela exceção expressa do CEO para runtime sem `agent_type`. Controles técnicos por papel permanecem NOT_ENFORCED. Encerramento local, sem commit ou publicação.
