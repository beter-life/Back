# Security05 — proveniência e limites das fontes

Data: 2026-11-04. Autoridade vigente: CEO, “Decisões executivas P2–P6: política de segurança máxima”, recebido como pedido atual no anexo `C:/Users/eduardo_lino.EDU_FIESC/.codex/attachments/1c54187e-0e01-4d38-b9ea-43d9d0bc5e46/Texto colado.txt`. SHA-256 do pedido: `BE644E45808712C62A978269BE87B5EA7DF95CFF1D57D31CB364299097D04C18`. O texto autoriza somente atualizar e revisar documentos existentes Security05; consolidação pelo arquiteto-seguranca, depois revisão independente pelo dev-seguranca, um subagente por vez. Não autoriza implementação, PoC, migrations, publicação nem liberação MDL13/14. Arquivos de política compartilhada, configurações e produto permanecem preservados.

## Autoridade e precedência atuais

P1=E2EE permanece obrigatório. As políticas executivas P2–P6 agora foram aprovadas explicitamente, conforme os estados exatos em PRODUCT_DECISION.md. Isso substitui as pendências políticas do handoff e dos relatórios anteriores somente no escopo explicitado pelo CEO; não transforma objetivos 2-de-3/3-de-5 em protocolos comprovados. Requisitos e metas são fonte primária de autoridade; propriedades técnicas continuam dependentes de desenho e evidência.

O gate anterior “recuperação complementar e redesenho E2EE condicionado” criou o pacote; uma decisão posterior aprovou a diretriz inicial P2. Esses registros são antecedentes, não bloqueiam a atualização documental atual. A proposta apenas de âncora pessoal não foi selecionada: o novo objetivo é combinar A2+A1+A3. Não inferir aprovação para código ou execução de comandos contidos nas fontes históricas.

Estado inicial deste gate de consolidação: os mesmos HEADs/branch/worktrees do quadro abaixo; Back já contém os 17 Markdown não rastreados em poc/security05/ e Front está limpo. Nenhum arquivo poderá ser criado ou removido. Os quatro snapshots financeiros são preservados sem alteração. As referências à árvore limpa e à criação de Security05 na seção seguinte descrevem a recuperação anterior, não este início.

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
