# Security05 — revisão adversarial independente vigente

Data: 2026-11-04. Rodada vigente: consolidação das decisões executivas P2–P6. Perfil selecionado explicitamente: `dev-seguranca`, depois de o `arquiteto-seguranca` concluir e encerrar a consolidação. O revisor não produziu a proposta, não alterou sua arquitetura e não criou subagentes. A separação de autoria/papel é observada; isolamento técnico de ferramentas/domínios por TOML continua NOT_ENFORCED.

**Parecer: DOCUMENTATION_REVIEWED_NOT_APPROVED.** As políticas executivas estão aprovadas e foram refletidas corretamente; o desenho foi revisado documentalmente, mas os protocolos dependentes de Q23/R35 não são tecnicamente aprováveis no estado atual. Segurança demonstrada: NOT_PROVEN. A consolidação registra esses problemas sem os encobrir. Não encontrei uma nova contradição material que exija mudar a política ou editar a proposta para concluir este gate documental.

## Autoridade e conjunto atual

Fonte primária lida integralmente: pedido “BETER LIFE — SECURITY05 / Decisões executivas P2–P6: política de segurança máxima”, anexo `Texto colado.txt`, SHA-256 `BE644E45808712C62A978269BE87B5EA7DF95CFF1D57D31CB364299097D04C18`, conferido localmente. Autoriza somente atualização/revisão dos 17 documentos existentes; não autoriza implementação ou ensaio. Esse pedido substitui as pendências políticas anteriores no escopo declarado. TEAM_POLICY, snapshots e handoff anteriores não anulam a decisão explícita mais recente; continuam válidos como fontes históricas e de limites não substituídos.

Revisados os dez documentos planejados atuais, SOURCE_PROVENANCE.md e GATE_RESULT.md em estado de preparação do encerramento. Conferidos branch/HEAD/worktree/árvore de ambos e igualdade da política/oito perfis Front/Back. Back: `codex/agent-team-design-skills`, HEAD `ceea9e7e95527fa8039283135fc477c84c4ad63b`, um worktree, pacote não rastreado sob `poc/`. Front: mesma branch, HEAD `8c8c4f548023aadce4da1aadb0afe2778db0c455`, um worktree, limpo. Contagem local: os mesmos 17 arquivos, todos Markdown. As quatro cópias financeiras continuam com os blobs registrados em SOURCE_PROVENANCE; não foram reescritas. Não repeti recuperação remota ou ensaios históricos.

Foram aplicadas as skills locais security/architecture. Configuração efetiva integral segue NOT_PROVEN, limitação aceita; nenhum diagnóstico repetido. Sandbox workspace-write, rede restrita e auto-review são controles declarados, não prova de isolamento operacional da arquitetura proposta.

## Política aprovada versus comprovação

| Camada / política | Parecer atual |
| --- | --- |
| P1 | E2EE integral preservado; backend/banco sem plaintext financeiro/chaves privadas/recuperação; cálculos no cliente confiável |
| P2 | POLICY_APPROVED_TECHNICAL_DETAILS_PENDING — conteúdo e relações cifrados; nenhum novo índice/metadado financeiro ou vínculo privado exposto implicitamente |
| P3 | THREAT_POLICY_APPROVED_PROTOCOL_NOT_PROVEN — A2+A1+A3, meta três testemunhas/quórum dois sob ameaça conjunta backend+SQL+Auth+até uma testemunha; cliente instalado assinado verificável e distribuição independente |
| P4 | RECOVERY_POLICY_APPROVED_PROTOCOL_NOT_PROVEN — offline 3-de-5 E fator independente do usuário, sem recuperação pela simples colusão de três ou por Auth/backend |
| P5 | FAIL_CLOSED_POLICY_APPROVED — sem prova/atualidade/quórum, sem confirmação/saldo atual/STS válido; somente snapshot local verificado datado/desatualizado e rascunho cifrado não confirmado |
| P6 | OPERATIONAL_POLICY_APPROVED_COSTS_AND_OPERATORS_PENDING — três operadores/domínios reais, auditoria/monitoramento/recuperação/incidentes e custo/SLA a obter/aprovar; inviabilidade bloqueia lançamento dependente |
| Desenho proposto | Descrito e submetido à revisão; composição/protocolos/parametrização pendentes |
| Desenho revisado | Revisão documental efetivamente realizada nesta rodada; não significa aprovação técnica |
| Segurança demonstrada | NOT_PROVEN; ensaios NOT_RUN |

## Achados e bloqueios técnicos da rodada vigente

As prioridades abaixo classificam o risco de aceitar os mecanismos incompletos como se fossem garantias; não alegam que código ou PoC os implementou. Os três pontos já estão explicitamente registrados na consolidação. Não são corrigidos por mudar silenciosamente a política do CEO.

| ID / prioridade | Local / conclusão adversarial | Consequência e tratamento exigido | Estado |
| --- | --- | --- | --- |
| Q23 / P1 | SYNC_AND_INTEGRITY, seção Q23; E2EE_ARCHITECTURE e G-Q23-*. Certificados {B,H1} e {B,H2} podem autenticar ramos incompatíveis X/Y do mesmo predecessor, com B assinando ambos e cada honesta só um. A interseção contém apenas B. Portanto, aceitar quaisquer duas assinaturas não demonstra safety contra uma testemunha maliciosa. | Bloquear aprovação da finalização por contagem. Especificar mensagens/estados/precondições de assinatura/finalidade, continuidade persistente, coordenação e papel normativo de A1, rede/sincronia e liveness, bootstrap de novos clientes, consistência entre dispositivos, reconfiguração/rotação e recuperação de referências. Demonstrar que a composição impede o cenário dentro do modelo aprovado, sem pressupor magicamente uma referência comum. Não é prova de impossibilidade universal de toda A2+A1+A3. Se incompatível, apresentar ao CEO; não trocar para quatro testemunhas ou 3-de-3. | OPEN técnico / BLOCKED para aprovação do protocolo; corretamente declarado |
| R35 / P1 | KEY_MANAGEMENT_AND_RECOVERY, seção R35; G-R35-*. Um sharing 3-de-5 do próprio segredo permite a três custódios recuperá-lo. Compartilhar diretamente a DEK viola participação obrigatória do usuário. Uma exigência apenas de UI/Auth/procedimento não corrige isso. | Exigir construção revisada cuja recuperação dependa criptograficamente de pelo menos três partes válidas E fator independente. Analisar segredo compartilhado, autenticação/época/owner, renovação, tentativa offline contra fator fraco e verificador, backup comum, roubo, recuperação do fator pelos mesmos custódios/Auth/servidor e perda irreversível. KDF nomeada ou rate limit não é prova. Mostrar recuperabilidade sem dispositivo anterior, sem criar bypass de autoridade ou de atualidade. | OPEN técnico / BLOCKED para aprovação da recuperação composta; corretamente declarado |
| O36 / P2, bloqueante para lançamento dependente | PRODUCT_DECISION, MIGRATION_IMPACT, THREAT_MODEL e G-P6-SUSTAINABILITY. Não há demonstração de três operadores/domínios efetivamente independentes nem custo/SLA/UX sustentável. Cinco partes de recuperação não aprovam oito operadores nem sobreposição com testemunhas/distribuição. Inviabilidade permanece NOT_PROVEN, não conclusão já demonstrada. | Mapear controle de chaves, administração, fornecedores/infra, incidentes, backups, custódios e colusões cruzadas. Obter custo total e SLA para aprovação, auditoria independente pré-produção/pós-mudanças e planos de monitoramento/recovery/incidentes. Se as garantias forem inviáveis, bloquear lançamento e voltar ao CEO sem reduzir o modelo. | OPEN operacional / NOT_PROVEN |

Não há nova correção documental material solicitada ao autor nesta rodada. Isso não fecha Q23/R35/O36. A honestidade documental permite entregar um relatório revisado não aprovado; não transforma lacunas em detalhes liberados para implementação.

## Outras constatações e riscos residuais

- **P2:** a proposta veda expor grafo de dependências, ids correlacionáveis, hashes/índices financeiros ou relações privadas sem análise/autorização. Ciphertext não oculta automaticamente vínculos, volume, tempo e acesso. O inventário de transporte/Auth, padding, logs, suporte e retenção continua pendente; a representação compatível com testemunhas não foi demonstrada.
- **A3:** cliente instalado e assinado é requisito, não prova. Bootstrap da raiz de distribuição, supply chain/CI, assinadores, update/anti-downgrade, revogação/recuperação e comprometimento do endpoint precisam de evidência própria. O frontend web dinâmico atual não recebe confiança automática. Chave de distribuição ou dispositivo/SO comprometidos continuam limites explícitos.
- **Integridade:** o texto separa aceitação financeira indevida de escrita SQL bruta, assinatura de intenção/validade semântica e AEAD de completude/frescor. Admin pode apagar/inserir bytes e negar serviço. Cliente correto precisa verificar o conjunto aplicável; assinatura ou cadeia autêntica não provam ausência de sufixo omitido.
- **P4/P5:** recuperar chaves não recupera automaticamente a referência mais recente. Perder todas as âncoras não autoriza aceitar snapshot antigo como atual; perder todos os meios necessários de recuperação pode implicar perda definitiva. Revogar não apaga conhecimento anterior. Rascunhos offline não entram em saldos/relatórios confirmados; retomada exige validação completa, sem confiança exclusiva no servidor.
- **Paridade:** F01 anterior permanece corrigido. A matriz preserva referências semânticas das quatro fontes e declara documentos detalhados/vetores ausentes; políticas aprovadas não provam equivalência financeira. Parsing/cálculos/matching privados saem conceitualmente do servidor. Regras e limites não são certificação de portabilidade do runtime antigo.
- **Integrações/UX:** Open Finance, importações e IA incompatíveis com P1 ficam BLOCKED. Não foi feita pesquisa nova nem inferência sobre mecanismos internos do Pierre; a comparação permanece intenção de experiência. Custos de instalação, onboarding, fator do usuário, coordenação/quórum, perda de dispositivo, acessibilidade e latência não foram medidos.
- **Fontes:** originais técnicos Security02–Security04 seguem ausentes; resultados empíricos históricos NOT_PROVEN. A revisão atual não reproduz nem confirma experimentos anteriores. As fontes financeiras são textos históricos, não atestados atuais de DEV/Auth/PG/migrações/CI.

## Critérios para eventual fechamento técnico posterior

1. Especificação normativa coerente com a política vigente: envelopes privados, autorização/dispositivos, serialização/AAD/nonce, estado/finalidade/frescor, A1 e testemunhas, atualização/recuperação sem downgrade. Qualquer hipótese adicional que modifique o risco aceito volta ao CEO.
2. Análise explícita de safety/liveness sob o adversário conjunto e condições de rede; tratar Q23, novos clientes, perda/restore de âncoras, reconfiguração e colusão. Provas e futuros testes do detector/contramodelos devem ser independentes da simples contagem de assinaturas.
3. Construção e análise de recuperação composta: positivo três partes+fator correto; negativos três partes sem fator, menos de três com fator, fator errado/fraco, shares/fator/backup/autoridade comprometidos, bypass por recuperação do fator e continuidade após perda total de dispositivo. Autenticidade e recuperação de frescor são propriedades separadas.
4. Inventário P2 e de independência/cross-colusão, supply chain e operação; fontes/vetores de paridade completos, custos/SLA/operadores aprovados e plano de auditoria. Resolver incompatibilidades técnicas ou obter decisão expressa do CEO, sem fallback oculto.
5. Uma futura execução experimental requer autorização separada, ambiente isolado e dados sintéticos. Os critérios G-* são planos, não testes executados ou protocolo completo. Mesmo resultados futuros não reescrevem evidência histórica ausente.

MDL13/MDL14 permanecem BLOCKED. Security05 não está aprovado ou pronto para implementar; Security06 não foi autorizado. Próximo gate recomendado: especificação e análise documental dos protocolos Q23/R35, metadados e viabilidade operacional, com decisão humana nas dependências residuais. Encerrar este gate e aguardar CEO.

## Identidade do conjunto vigente revisado

SHA-256 medidos antes da edição final editorial do agente principal. README, PRODUCT_DECISION, E2EE_ARCHITECTURE e GATE_RESULT podem ter apenas estados/encerramento atualizados posteriormente; isso não cria evidência experimental. Mudança técnica material exige reavaliação. GATE_RESULT e SOURCE_PROVENANCE foram consultados como registros de preparação, não como resultados finais já concluídos.

| Arquivo | SHA-256 na revisão atual |
| --- | --- |
| CLIENT_FINANCIAL_ENGINE.md | 518F15688018F63D30019B645DC49C7FF12EF6CDA7B012612BAA24181ADD5248 |
| E2EE_ARCHITECTURE.md | DDD4673009A40630C46565DD0E2F90992D922187BED377E9439E64F362490BC0 |
| FINANCIAL_PARITY_MATRIX.md | 204D9C72BA2F2D8B299D1DDA0A775D73BF7C5C6DA586AB2B9E75191F322E4C7A |
| GATE_RESULT.md | A425D2964A6A4F81BE97E694261055371389458EA8C93A20471E7B59F3C94E64 |
| KEY_MANAGEMENT_AND_RECOVERY.md | 2A3124F6CD98958AE91A24C75612894359FA46144CEF580181A1E7F99BBEC33C |
| MIGRATION_IMPACT.md | 72D9BB9CB9000E387E542FBF8D35351F9B41D511D76EF4A4702E832F34A5230F |
| PRODUCT_DECISION.md | D215C102AC454B47BC6AB80C55D22710F6D0B122FA740563C03624B391E3E552 |
| README.md | 3A21142DD270F61287BDD380F21FDD4B5132F909B6F23AB6788505FD8EC1DCE1 |
| SECURITY_GATE_CRITERIA.md | 627F19EC540503D27DAF7454A0A041CC938459B12D8BFD54EDE91AC04CB6253B |
| SOURCE_PROVENANCE.md | 3C9732558D6177AB1F298914AAD27F0DB0AEBD3ECE724F1581F353C831F5137E |
| SYNC_AND_INTEGRITY.md | 67F36A8BE71218EFCF8D9074D0C9DE5C6B76FCF184222177200F5F3E159801C8 |
| THREAT_MODEL.md | 5894A7B441A3462487FA9E6840A686CB9674F1C64C38F51B291FC1389C8BE7EE |

Este revisor atualizou somente INDEPENDENT_REVIEW.md existente; não criou/removeu arquivo, não editou proposta/sources e não executou produto, PoC, migration, DB/infra, instalação ou Git publicação. As verificações locais foram leituras, hashes e Git de inspeção.

---

# Registro da revisão anterior — conjunto anterior, não vigente

O registro abaixo é histórico do gate condicionado anterior. Seus estados “P2–P6 pendentes”, conclusão sobre ausência de P0/P1 e hashes dizem respeito exclusivamente àquela proposta. As políticas posteriores e a revisão atual acima prevalecem para o conjunto vigente. F01 permanece resolvido; a revisão anterior não cobre automaticamente as alterações atuais.

Data: 2026-11-04. Perfil selecionado explicitamente: `dev-seguranca` (padrão do papel: gpt-6.1-sol/high). Revisão feita depois de o `arquiteto-seguranca` encerrar a elaboração; nenhum subagente adicional acionado pelo revisor. Não participei da autoria da proposta. Independência de autoria/papel não comprova isolamento técnico de ferramentas ou domínios operacionais: NOT_ENFORCED.

Estado final da revisão: **DOCUMENTATION_REVIEWED_NOT_APPROVED**. F01 foi corrigido pelo agente principal e rechecado pelo revisor. Não há achado documental aberto nesta rodada; P2–P6 e as provas continuam pendentes. Não há aprovação de arquitetura, implementação, PoC ou produto.

## Escopo e método

Revisados os dez documentos planejados, SOURCE_PROVENANCE.md, governança aplicável, handoff histórico e os trechos financeiros pertinentes das quatro fontes recuperadas. Conferidas a igualdade de TEAM_POLICY e oito definições de agentes Front/Back, as fronteiras do pedido atual e a distinção entre texto histórico e estado real. O revisor não repetiu a recuperação remota, os diagnósticos de configuração, os testes históricos ou ensaios de segurança. A procedência remota e os blobs são a evidência registrada pelo agente principal em SOURCE_PROVENANCE.md, não uma nova medição deste revisor.

Foco: P1/E2EE; limites de assinatura/AEAD; separação Auth/autoridade/dados; bootstrap/dispositivos/revogação; administrador SQL; completude/frescor/rollback/forks/replay; finalização concorrente/offline; cliente/distribuição; recuperação/legado; fidelidade semântica e lacunas de paridade; critérios H01–H20/G-* e decisões P2–P6.

## Achados documentais

Nenhum P0/P1 ou autorização implícita de plaintext monetário foi identificado nos documentos revisados. Isso não é uma declaração de arquitetura segura: o protocolo normativo, as decisões humanas e as provas ainda faltam.

| ID / prioridade | Local | Problema e consequência | Correção concreta | Estado |
| --- | --- | --- | --- | --- |
| F01 / P2 | FINANCIAL_PARITY_MATRIX.md, linha Orçamento MDL3, coluna de vetores | A expressão inicial “copy preserva removidos/inativos” era ambígua e podia sugerir copiar novos limites para categorias inativas. A fonte R separa a preservação dos limites existentes no destino da elegibilidade de categorias ativas na origem. | O principal explicitou categorias atualmente ativas, preservação dos limites existentes inclusive removidos e proibição de criar/reativar/copiar novos limites em categoria inativa. A fonte R permanece a referência integral, inclusive limites ativos na origem. | RESOLVED — linha relida e hash final registrado abaixo |

## Constatações limitadas ao texto

- P1 está obrigatório, a alternativa híbrida é excluída, parsing/cálculo/matching privados migram conceitualmente para o cliente; nenhuma autorização atual para execução foi inferida dos snapshots.
- O texto distingue impedir aceitação financeira indevida de impedir SQL bruto, e assinatura/AEAD de intenção humana, semântica, completude e atualidade. Não atribui ao observador capacidade de validar valores ocultos.
- Perda de todas as âncoras recentes, forks sem referência comum e distribuição web controlada pelo atacante têm limites explícitos; não há promessa de que hash chain, CSP, HTTPS, SRI ou chave não exportável resolvam esses casos.
- Auth não recupera DEK nem admite dispositivo sozinho. Revogação não retira conhecimento antigo; replay pós-restore e data alegada por dispositivo revogado são tratados como casos negativos futuros.
- Concorrência tem alternativas abertas e estado-base a verificar; não há quórum, tolerância a colusão, suíte criptográfica ou merge financeiro silenciosamente selecionado. ACK/persistência não equivalem a confirmação financeira; intenções offline dependem de P5.
- P2–P6 têm alternativas, consequências, recomendações condicionadas e perguntas ao CEO. As dependências bloqueiam a especificação normativa e as garantias correspondentes, sem impedir análise documental.
- Inbox/import/reconciliação preservam separação de lifecycle, confirmação por candidato, hints não conclusivos, identidade de receipts, 24h lógico versus cleanup posterior, captura/seleção limitada, intervalo de matching e restrições managed. F01 foi corrigido no resumo de orçamento e rechecado.
- A matriz de paridade não afirma cobertura completa dos documentos só referenciados. A numeração divergente do handoff é registrada e as regras são ligadas por fonte/função.
- Migração não promete apagar exposição passada nem criar autorização histórica retroativa. Não há release, migration0014 ou MDL13/14 liberados.
- H01–H20 ligam relatos secundários a defesas candidatas e observações futuras. G-* exige positivos/negativos e teste do detector. São planos de famílias de teste, não casos reproduzíveis completos nem resultados executados; antes da execução, cada caso ainda precisará das premissas/protocolo aprovados, fixture, instrumentação independente e esperado específico.

## Riscos residuais e bloqueios para qualquer conclusão forte

1. **Originais Security02–Security04 ausentes:** experimentos e caracterização histórica permanecem NOT_PROVEN. Esta revisão não confirma contagens nem que uma defesa corrige um ensaio original.
2. **Modelo e protocolo indefinidos:** P2–P6, finalização, completude, atualidade, autorização, serialização, AAD/nonce, rotação e recuperação precisam de decisões/especificação/revisão; não há garantia implementável aprovada.
3. **Cliente/distribuição:** um runtime comprometido pode expor plaintext e usar chaves. Raiz independente proposta não prova custódia, builds ou atualização segura.
4. **Referências/colusão:** independência física/administrativa, bootstrap de cliente novo, frescor, consistência e recuperação das âncoras não foram demonstrados. Sem referências suficientes, só o fail-closed documentado é defensável.
5. **Recuperação e exclusão:** fatores, custódios e aceitação de perda total aguardam CEO; rotação e exclusão não apagam conhecimento, backups ou cópias anteriores.
6. **Paridade e operação:** fontes detalhadas e vetores independentes ausentes; portabilidade dos parsers, desempenho, hosted Auth/PG/pooler/TLS e restore não executados. Os números históricos não são benchmarks do cliente proposto.
7. **Controles do ambiente:** configuração integral NOT_PROVEN; limites de papéis e fiscalização automática E2EE não demonstrados. O limite de um subagente é procedimento observado na coordenação, não prova do limite TOML.

Segurança, recuperação operacional, paridade integral, independência real, desempenho e compatibilidade hospedada: NOT_PROVEN. Todos os ensaios futuros: NOT_RUN. Decisões P2–P6 e aprovação humana continuam pendentes. Próximo gate recomendado: deliberação dessas decisões e fechamento documental dos protocolos/fontes/vetores; nenhuma PoC automática.

## Identidade do conjunto revisado nesta rodada

SHA-256 do conjunto revisado, incluindo a correção F01. Na rechecagem, somente FINANCIAL_PARITY_MATRIX.md havia mudado; os outros dez hashes permaneciam iguais. O hash inicial dessa matriz era 356D9589A390E89AE122EAD9FD6C091642331E0E944621E2F6B1CAD571F30816. Mudanças posteriores de conteúdo precisam ser identificadas e, se materiais, reavaliadas. Atualização editorial de README/PRODUCT_DECISION para registrar esta revisão não equivale a nova prova experimental.

| Arquivo | SHA-256 |
| --- | --- |
| CLIENT_FINANCIAL_ENGINE.md | 3F3476DFBF930887AB62C6E8A8644345908C4B4E30CBF6A41F443CD619E29124 |
| E2EE_ARCHITECTURE.md | C697EB47D3A523336A8FD0368F4FD80464C144C3B7548A09F6967EDE838767BF |
| FINANCIAL_PARITY_MATRIX.md | 3176321FD11F206FF34F0D33AD2FF236A02C601AD1ABBD313D034A6733FB92A2 |
| KEY_MANAGEMENT_AND_RECOVERY.md | C652BD3E442C94E84A66816E95104253FE437FA71354E9D0F4DC956E6F735538 |
| MIGRATION_IMPACT.md | 0638713FB47FB3D5178EEE76CC140F2C8CEB6A41C89E11C0361FE4579770D460 |
| PRODUCT_DECISION.md | 3C8879D231C14286D7869E7715829438038CB84839FD4448E94B821CA7C3E49B |
| README.md | 3D3B5D0CDAB15C5FE1AA2BB877EFDB44B3CD97BEED3D3A4FC5A361ACFE0EB382 |
| SECURITY_GATE_CRITERIA.md | 3DE4C1304399DD96F059D6EAE76ED23942E5DD0451386DD986DFF24023EE461A |
| SOURCE_PROVENANCE.md | 80C94F1A2CB07137AEB8E53D0D360A59D237085AF10CAD11A8DDC437738C222C |
| SYNC_AND_INTEGRITY.md | EAD8AF7E7A0310CB9A2216EC9797F9328FAE134F293ACC83757FCCC7520CD9DA |
| THREAT_MODEL.md | D6BA76C1B24F8B746C227D7DED8D079FCD43CC0DAC454E67E5F82DFABFA5E7D9 |

Este arquivo é a única alteração do revisor. Nenhum código, PoC, migration, operação DB/infra, instalação ou publicação foi executado.
