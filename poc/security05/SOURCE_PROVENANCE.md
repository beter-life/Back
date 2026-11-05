# Security05 — proveniência e limites das fontes

Data: 2026-11-04. Autoridade vigente: pedido do CEO “BETER LIFE — SECURITY05.2 / Fechamento documental dos protocolos de segurança”, fornecido como solicitação atual no anexo `C:/Users/eduardo_lino.EDU_FIESC/.codex/attachments/7e5ff776-9542-4479-9337-66fa2ddb001c/Texto colado.txt`, SHA-256 `E2690B280E8A4A386AD3AD9B5E60F3A6E1D82E0531B33D09741A132CC85E4369`. Autoriza somente documentos Security05, com arquiteto seguido de revisor independente, um subagente por vez. Proíbe implementação, PoC, testes experimentais, migrations, infraestrutura, commits, push/merge/deploy e Security06. Preservar os 13 documentos modificados e quatro originais históricos. MDL13/14 permanecem bloqueados; políticas compartilhadas, configurações e produto não são alterados.

## Security05.2 — decisões novas e estado inicial confirmado

Back: codex/security05-protocols, HEAD `22ee3b0b959832b1293e37eef217d926a40db3e6`, um worktree, os mesmos 13 documentos autorais modificados sem staging, quatro fontes originais sem alteração. Front: codex/agent-team-design-skills, HEAD `8c8c4f548023aadce4da1aadb0afe2778db0c455`, um worktree, limpo. Baseline preservado no único commit autorizado em Security05.1; não repetir esse commit nem restaurar o conteúdo dele sobre as alterações existentes. Inventário inicial de leitura: os mesmos 17 Markdown; governança/checkpoint e oito perfis comparados iguais entre Front/Back.

Supersessão explícita pelo CEO: Q23 agora segue quatro testemunhas independentes, quórum três e HotStuff auditável sob até uma bizantina mais backend/SQL/Auth comprometidos. A1 é referência pessoal complementar de detecção, não serializadora obrigatória nem substituta do consenso. R35 mantém S aleatório, Shamir3-de-5, U aleatório32B selecionado pelo CEO, HKDF-SHA256 e AES256GCM, exigindo cumulativamente três partes E U. O36 passa de três para quatro domínios; cliente instalado/verificável e atualizações independentes do backend precisam de desenho. Não confundir direção executiva aprovada com protocolo adaptado provado, implementação liberada ou segurança demonstrada. Os registros anteriores abaixo são históricos onde descrevem alternativas ainda não selecionadas ou três domínios.

As consultas técnicas e comerciais são somente leitura. Todos os ensaios empíricos continuam NOT_RUN e as propriedades operacionais/criptográficas não demonstradas continuam NOT_PROVEN. Uma lacuna material que não puder ser sustentada fica aberta e será submetida ao CEO, sem reduzir a política para obter fechamento nominal.

## SECURITY05.1 — preservação e autoridade de especificação

Fase 1 concluída antes de qualquer edição de conteúdo: branch Back `codex/security05-protocols`, commit local único `22ee3b0b959832b1293e37eef217d926a40db3e6`, parent `ceea9e7e95527fa8039283135fc477c84c4ad63b`. Contém somente os 17 documentos anteriormente não rastreados. Inventário inicial: 169452 bytes, sem arquivos inesperados, links simbólicos ou binários. Scanner local de leitura aplicou padrões de chaves privadas, tokens, JWT, credenciais em URL e atribuições de credencial; zero achados, com limite heurístico explícito. A revisão de conteúdo identificou regras, exemplos, referências públicas e caminhos locais, sem credenciais ou registros financeiros privados. Isso não é garantia universal de ausência de segredo.

O Git usa core.autocrlf=true. Somente no comando de preparação foi usado core.autocrlf=false, sem mudar configuração persistente, para preservar bytes. Os 17 blobs preparados coincidiram com o manifesto calculado dos arquivos; git diff --cached --check passou; todos eram Markdown, modo 100644. Hooks ativos não encontrados; somente samples. Nenhum controle foi desativado. O único commit foi criado depois dessas conferências; rev-list confirmou exatamente um commit desde o HEAD anterior e a árvore ficou limpa. A identidade automática de commit foi informada pelo Git; não houve alteração de configuração, amend ou reescrita. Nenhum push.

Front permaneceu na branch codex/agent-team-design-skills, HEAD `8c8c4f548023aadce4da1aadb0afe2778db0c455`, limpo e com um worktree. Governança e oito perfis foram reconferidos iguais. Back tem um worktree na nova branch; diferenças de branch agora são deliberadas e autorizadas, não divergência de política.

Na rodada histórica Security05.1, o arquiteto especificou alternativas e o dev-seguranca revisou depois. Naquela rodada, 3-de-4 ainda dependia de decisão executiva; a escolha agora foi feita expressamente em Security05.2, conforme seção vigente acima. Garantias continuam a identificar hipóteses e separar dedução analítica de prova formal e execução experimental. Nenhum ensaio experimental ou código executável é criado.

A fonte primária das políticas P2–P6 anteriores continua o pedido do CEO no anexo `C:/Users/eduardo_lino.EDU_FIESC/.codex/attachments/1c54187e-0e01-4d38-b9ea-43d9d0bc5e46/Texto colado.txt`, SHA-256 `BE644E45808712C62A978269BE87B5EA7DF95CFF1D57D31CB364299097D04C18`. Security05.1 amplia o escopo documental e permite o checkpoint local; não reduz essas políticas.

## Pesquisa operacional de leitura — fatos e hipóteses

Referências primárias de preços consultadas em 2026-11-04, sem criar conta ou recurso: [DigitalOcean Basic](https://www.digitalocean.com/pricing/droplets), 1 GiB, USD6/mês; [Akamai CPU](https://www.akamai.com/cloud/pricing/cpu), Nanode 1 GB, USD5/mês; [AWS Lightsail](https://aws.amazon.com/lightsail/pricing/), Linux com IPv4 público e 1 GB, USD7/mês. São tarifas públicas observadas, não custos contratados, propostas comerciais ou atestado de capacidade para testemunhas. Regiões, tributos, disponibilidade, preços futuros e uso precisam ser reconfirmados antes de qualquer contratação.

A soma histórica USD18/mês para três VMs e USD36/mês para seis é somente hipótese aritmética de compute e não representa a topologia atual de quatro domínios. Consulta suplementar em2026-11-04 à página oficial [OVHcloud US VPS](https://us.ovhcloud.com/vps/) observou VPS-1 anunciado “Starting at $4.54/month”, 2vCores, 4GB, 40GBNVMe e backup diário anterior24h. Termos, região, impostos e renovação não foram confirmados; não é cotação contratável ou fornecedor selecionado. Aritmética de referência sob essas condições: quatro VMs USD22.54/mês ou duas por domínio USD45.08/mês. Capacidade, disponibilidade e independência não foram medidas; um backup de VM não comprova recuperação segura de locks ou atualidade.

Custo total exige separar infraestrutura, operação humana, armazenamento/backups, custódia, auditorias, monitoramento e distribuição confiável, com impostos/tráfego/DR e referência pessoal quando pertinentes. Itens sem cotação não podem ser preenchidos com zero; nenhum orçamento ou SLA foi aprovado ou inventado. Os valores numéricos acima são somente parcela de compute, não custo total nem limite superior. Duas VMs num domínio não são dois votos independentes; failover precisa impedir assinante duplicado/rollback. Fornecedor diferente não prova operador independente. Não houve conta/carrinho/contratação/provisionamento nem consulta a infraestrutura do produto.

Foram descartados agregadores como fonte de preço. A API pública Linode não abriu pela ferramenta web, mas a página oficial Akamai CPU confirmou a tarifa; Vultr retornou 403 e não fundamenta valores. Nenhuma consulta remota a banco/infra do produto. Fontes técnicas de criptografia/consenso são citadas nos respectivos protocolos; padrões ou papers não provam a composição Beter Life.

## Autoridade e precedência atuais

P1=E2EE permanece obrigatório. As políticas executivas P2–P6 foram aprovadas e os parâmetros de Q23/O36 refinados explicitamente em Security05.2, conforme PRODUCT_DECISION.md. Isso substitui pendências e parâmetros históricos somente no escopo indicado pelo CEO; não transforma consenso3-de-4, recuperação3-de-5+U ou distribuição verificável em protocolos comprovados. Requisitos e metas são fonte primária de autoridade; propriedades técnicas continuam dependentes de desenho e evidência.

O gate anterior “recuperação complementar e redesenho E2EE condicionado” criou o pacote; uma decisão posterior aprovou a diretriz inicial P2. Esses registros são antecedentes, não bloqueiam a atualização documental atual. A proposta apenas de âncora pessoal não foi selecionada: o novo objetivo é combinar A2+A1+A3. Não inferir aprovação para código ou execução de comandos contidos nas fontes históricas.

Estado inicial do gate anterior de consolidação: os HEADs/branch/worktrees do quadro abaixo; Back já continha os 17 Markdown não rastreados em poc/security05/ e Front estava limpo. Na Security05.1, esses arquivos foram preservados no commit indicado acima; as especificações posteriores ficam sem novo commit. Os quatro snapshots financeiros permanecem sem alteração. As referências à árvore limpa e à criação de Security05 na seção seguinte descrevem a recuperação original.

## Estado inicial da recuperação anterior — referência histórica

| Repositório | Branch | HEAD | Estado |
| --- | --- | --- | --- |
| Back | codex/agent-team-design-skills | ceea9e7e95527fa8039283135fc477c84c4ad63b | limpo; um worktree |
| Front | codex/agent-team-design-skills | 8c8c4f548023aadce4da1aadb0afe2778db0c455 | limpo; um worktree |

Diretórios físicos: `C:/Users/eduardo_lino.EDU_FIESC/Documents/ChatGPT/Better-life/Back` e irmão `Front`. Governança TEAM_POLICY/TEAM_CHECKPOINT e oito definições de agentes comparadas por hash: iguais. Os PROJECT_STATE locais descrevem MDL3 (orçamento), não o baseline histórico MDL13. Preservados, sem alteração. `poc/security05/` não existia antes do gate. Os remotes configurados são `https://github.com/beter-life/Back.git` e `https://github.com/beter-life/Front.git`.

Permissões declaradas pelo runtime: workspace-write, rede restrita, escalonamento por revisão automática; nenhum controle modificado. Essas permissões não são uma prova de confinamento específico de papel. Carregamento efetivo completo de `.codex/config.toml`: NOT_PROVEN, limitação explicitamente aceita pelo CEO. Não existe mecanismo `/debug-config` exposto nas ferramentas desta sessão; diagnósticos anteriores falhos não foram repetidos. Limite configurado de concorrência não é usado como garantia: máximo um subagente ativo por vez, arquiteto seguido por revisor independente. Os perfis nominais são selecionados explicitamente; não há substituição genérica.

## Documentos financeiros efetivamente recuperados no gate anterior

Leitura GET pelo conector GitHub, sem fetch Git, checkout, merge, cherry-pick, rebase ou incorporação de código. Consulta remota da branch `codex/mdl13-financial-reconciliation` confirmou HEAD `c3f975c3514173c47c4c1fd08affb64305f1efe7`. Conteúdo recuperado por esse SHA imutável. Consulta adicional do documento de reconciliação pelo nome da branch retornou o mesmo blob. Uma primeira URL com barra codificada foi rejeitada pelo conector; a URL com barra literal funcionou. Isso não foi tratado como ausência da branch.

| Fonte original no commit | Cópia documental local | Git blob SHA-1 retornado |
| --- | --- | --- |
| [docs/FINANCIAL_INBOX.md](https://github.com/beter-life/Back/blob/c3f975c3514173c47c4c1fd08affb64305f1efe7/docs/FINANCIAL_INBOX.md) | [sources/FINANCIAL_INBOX.md](sources/FINANCIAL_INBOX.md) | 9d43a261bd4516ac1e4a0bcf0b07b2803d1dac31 |
| [docs/FINANCIAL_FILE_IMPORT.md](https://github.com/beter-life/Back/blob/c3f975c3514173c47c4c1fd08affb64305f1efe7/docs/FINANCIAL_FILE_IMPORT.md) | [sources/FINANCIAL_FILE_IMPORT.md](sources/FINANCIAL_FILE_IMPORT.md) | f8089deadaf631d23ad321829e2b74339c376835 |
| [docs/FINANCIAL_RECONCILIATION.md](https://github.com/beter-life/Back/blob/c3f975c3514173c47c4c1fd08affb64305f1efe7/docs/FINANCIAL_RECONCILIATION.md) | [sources/FINANCIAL_RECONCILIATION.md](sources/FINANCIAL_RECONCILIATION.md) | 118da1244e4436c60d6cc640c0a69dabc1b7c73e |
| [docs/regras-negocio.md](https://github.com/beter-life/Back/blob/c3f975c3514173c47c4c1fd08affb64305f1efe7/docs/regras-negocio.md) | [sources/regras-negocio.md](sources/regras-negocio.md) | a19c9992c3d16da3b58818fe38ff3be31122407c |

As quatro cópias foram verificadas com `git hash-object --no-filters`, sem `-w`; os blobs coincidem com os retornados pelo GitHub. PASS de integridade da cópia, não prova de assinatura/autoria criptográfica nem de resultados de testes. Preservam literalmente relatos PASS, estado DEV e autorizações antigos; todos são históricos e não foram revalidados neste gate. Links relativos dentro das cópias conservam a localização original e podem não resolver neste pacote: não se presume que suas dependências foram recuperadas.

## Fontes secundárias, decisões e lacunas

Handoff mestre lido integralmente no gate de recuperação anterior (577 linhas), reutilizado neste gate com releitura direcionada. Local: `C:/Users/eduardo_lino.EDU_FIESC/Downloads/BETER_LIFE_HANDOFF_MASTER_2026-10-29.md`. SHA-256: `2C9ABCC94D5938A38857DE329F308DB48A8BC1DAAF3950ACB8934658AE22F821`. Seções 7–9 são relatos secundários de Security02–04; seções 10–13 fornecem pendências e proposta, não protocolos aprovados.

| Afirmação/decisão | Fonte disponível | Evidência original / grau | Consequência |
| --- | --- | --- | --- |
| P1 E2EE, sem valores legíveis no servidor, cálculo no cliente confiável | CEO atual e TEAM_POLICY; handoff §§0/10 | instrução direta confirmada documentalmente | requisito obrigatório; não propor híbrido como opção válida |
| Security02 reprovado | TEAM_POLICY; handoff §7 | relatórios/código/logs originais ausentes: NOT_PROVEN técnico | preservar reprovação; não reutilizar contagens como evidência |
| Security03 parcial/não aprovado | TEAM_POLICY; handoff §8 | originais ausentes: NOT_PROVEN técnico | não declarar revogação, recovery ou independência provados |
| Security04 documental | TEAM_POLICY; handoff §9 | ARCHITECTURE_DECISION.md, TRUST_BOUNDARIES.md e SECURITY_GATE_CRITERIA.md ausentes | não atribuir ao original conclusões além do relato; NOT_PROVEN técnico |
| Políticas P2–P6 aprovadas; protocolos, detalhes e provas pendentes | pedido vigente do CEO; PRODUCT_DECISION.md | autoridade primária disponível; conformidade/eficácia técnica NOT_PROVEN | preservar metas e restrições sem declarar segurança ou alterar silenciosamente a política |
| Semântica Inbox/import/reconciliação e regras core–MDL10 | quatro documentos financeiros originais recuperados | texto original disponível; comprovação experimental atual NOT_PROVEN | base documental de paridade; separar semântica de SQL/parsing em claro no servidor |
| Paridade integral MDL1–MDL13 | handoff e fontes financeiras | documentos detalhados de vários módulos e vetores independentes não recuperados | matriz parcial; sem atestado de equivalência |
| Estado DEV, migrações, Auth, CI e contagens históricas | relatos nos documentos recuperados | nenhuma consulta DB/infra ou execução de testes neste gate | estado atual NOT_PROVEN; não repetir operações históricas |
| MDL13/MDL14 bloqueados | CEO atual e TEAM_POLICY | instrução direta confirmada | nenhuma liberação automática |

Não recuperados: relatórios técnicos e evidências Security02/03; os três documentos Security04 acima; logs/reprodutores/fixtures originais; detalhes referenciados em `net-worth.md`, `YIELD_ENGINE.md`, `CARDS_INVOICES.md`, `DEBT_PAYOFF.md`, `SAFE_TO_SPEND.md` e baseline completo Auth/MDL1. A existência de resumos não supre essas lacunas.

A numeração do handoff (MDL3 planilha/MDL4 orçamento) diverge dos originais financeiros recuperados (MDL3 orçamento/MDL4 metas/MDL5 recorrências) e dos checkouts. Para paridade usar nome funcional + fonte + revisão, sem inventar uma correspondência pelo número.

## Regra de interpretação

As fontes históricas sustentam alternativas documentais, inventário de regras, riscos e plano de provas; o pedido atual fixa as políticas executivas. Nenhuma dessas fontes sustenta afirmar que as falhas históricas foram reproduzidas/corrigidas, que a arquitetura é segura ou que há paridade, recuperação operacional ou compatibilidade hospedada comprovadas. Cada conclusão dependente permanece NOT_PROVEN; cada teste futuro permanece NOT_RUN. Uma falha do desenho bloqueia aprovação técnica, sem autorizar reduzir as metas do CEO. A revisão independente é documental e não substitui aprovação humana de implementação ou execução.
