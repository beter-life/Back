# Security05.2 — revisão adversarial independente vigente

Data: 2026-11-04. Perfil nominal `dev-seguranca`, após o encerramento do `arquiteto-seguranca`, sem outros subagentes acionados pelo revisor. **DOCUMENTATION_REVIEWED_NOT_APPROVED**. A direção executiva foi refletida; o desenho foi revisado documentalmente. Segurança/refinamento operacional permanecem NOT_PROVEN e ensaios NOT_RUN. O handover candidato tem um contraexemplo de progresso material ainda aberto: não aprovar tecnicamente o protocolo apenas porque o relatório o descreve.

## Autoridade, escopo e conjunto atual

Li integralmente o pedido CEO SECURITY05.2 no anexo `7e5ff776-9542-4479-9337-66fa2ddb001c/Texto colado.txt`; SHA-256 conferido: `E2690B280E8A4A386AD3AD9B5E60F3A6E1D82E0531B33D09741A132CC85E4369`. Ele seleciona quatro testemunhas/q3/HotStuff, até uma bizantina junto com backend+SQL+Auth comprometidos; A1 complementar, sem serialização obrigatória; R35 com S aleatório/Shamir3-de-5/U32B aleatório/HKDF/GCM; quatro domínios reais. Essas escolhas não estão mais pendentes nem são alternativas intercambiáveis. P1/P2/P5, cliente verificável e os limites não substituídos continuam preservados.

Não há autorização de novo commit. Back observado: `codex/security05-protocols@22ee3b0b959832b1293e37eef217d926a40db3e6`, um worktree, os mesmos13 Markdown modificados sem staging e quatro fontes históricas preservadas. Front: `codex/agent-team-design-skills@8c8c4f548023aadce4da1aadb0afe2778db0c455`, um worktree, limpo. Política/checkpoint e oito perfis comuns foram comparados iguais. O commit é o checkpoint preexistente, não criado/repetido pelo revisor. Configuração efetiva completa segue NOT_PROVEN aceito; isolamento fino por papel NOT_ENFORCED.

Revisados os dez documentos atuais, SOURCE_PROVENANCE/GATE_RESULT em preparação e os históricos pertinentes deste relatório. A revisão anterior não cobre automaticamente esta rodada. Consultei a seção4.4 de [Basic HotStuff v6](https://arxiv.org/pdf/1803.05069v6) e a [TUF specification1.0.37](https://theupdateframework.github.io/specification/latest/) para as interfaces novas. As demais primitivas já analisadas permanecem componentes, não prova da composição. Não repeti preços, recuperação remota ou diagnósticos de configuração. Nenhum teste experimental/model-checking foi realizado.

## Correções documentais materiais rechecadas

| ID | Contraexemplo concreto | Tratamento pelo principal e estado |
| --- | --- | --- |
| F03 / P1 de integridade criptográfica no lifecycle proposto | M0 contém ambos envelopeIDs e seu digest entra no AAD de ambos. data fica SEALED; authority fica PENDING após crash. Trocar só o IDauthority muda M0/AADdata sem mudar a KEKdata. Reusar data antiga com M0novo falha autenticação; recifrar data com KEK/IV anteriores e AADnovo viola one-shot. | KEY agora reserva M0/TODOSIDs/setID/salt antes da primeira encrypt; M0 é imutável. PENDING de uso incerto ou mudança de M0 abandona o conjunto incompleto inteiro, com novos S/coeficientes/setID/salt/TODOSIDs/M0/KEKs/ShareRecords/envelopes/Mfinal coerentes. SEALED só retransmite bytes sob mesmoM0; ACTIVE só muda por rotação autorizada. T-R-MANIFEST-CRASH e T-R-NONCE-CRASH foram relidos. RESOLVED documentalmente; durabilidade/RNG/crash ainda NOT_PROVEN. |
| F04 / P1 da fronteira de distribuição | Um binário assinado poderia ser wrapper de webview, JS/WASM/plugin/template remoto fornecido pelo backend comprometido, com ponte para plaintext/U. Assinatura apenas do wrapper não protege todo o contexto financeiro. | E2EE_ARCHITECTURE passou a exigir que TODO código ativo/dependências e pontes no contexto de plaintext/chaves/shares/U integrem artefato/manifest verificado. Backend só fornece dados não executáveis; config não seleciona código fora do conjunto autorizado. T-A3-REMOTE-CODE cobre negativo e positivo. RESOLVED documentalmente; norma não demonstra ausência de RCE, bugs de parser ou código malicioso validamente autorizado. |

F01 e F02 anteriores continuam resolvidos no texto. Nenhuma correção documental material adicional foi solicitada nesta rodada; os bloqueios técnicos abaixo continuam abertos e precisam ser entregues ao CEO, não encobertos por esse encerramento.

## Q-RECONFIG — contraexemplo de progresso da adaptação, OPEN/P1

Considere B bizantina e H1/H2/H3 honestas. Uma transcrição possível de refinamento, sem executar código:

1. Na view v liderada por B, F é um FREEZE autorizado. B obtém prepareQC e precommitQC com B/H1/H2, mas entrega a precommitQC somente a H1. H1 persiste lockedQC e FREEZE_VOTED antes de emitir commit-vote; não existe commitQC/FreezeCert de F. H2 conhece prepareQC de F, mas ainda não está locked em F; H3 não está locked em F.
2. Views honestas intermediárias podem expirar sem decisão por atrasos anteriores ao sincronismo. Em futura view cujo líder volta a ser B, B propõe ramo normal G incompatível com F, usando justificação admissível de ancestral anterior. B pode ignorar prepareQC maior que conhece; H2/H3 sem lock em F não são obrigadas pelo safeNode isolado a recusar G. Não se pressupõem líderes B consecutivos contra round-robin.
3. B/H2/H3 podem completar o núcleo para G. F não foi decidido, portanto não há dois commits conflitantes do HotStuff. Mas H1 permanece irreversivelmente congelada para F pela adaptação e não pode votar G ou sua continuação. Quando B passa a reter votos, restam apenas H2/H3, insuficientes para q3, mesmo com rede recuperada.

O problema é a interação de freezeVoted antes da decisão com locks reversíveis conforme o núcleo: uma restrição terminal adicional retira uma honesta do progresso. A transcrição é argumento analítico localizado, não teste nem prova de impossibilidade de toda reconfiguração. O texto atual reconhece essa tensão. Retransmitir F não resolve quando F deixou de ser ramo final admissível; timeout não autoriza descongelamento, reset de época ou novo successor sem prova. FREEZE–INSTALL–ACTIVATE permanece adaptação OPEN/BLOCKED para aprovação técnica até refinamento/protocolo publicado compatível e prova de safety E liveness, ou deliberação CEO sobre a parte dependente.

## Invariantes do consenso — contraexemplos por propriedade

As conclusões abaixo distinguem aritmética/argumento analítico, hipótese de confiança e lacuna de refinamento. Todas as eficácias empíricas são NOT_PROVEN. Não se atribui a witness capacidade de validar o valor oculto.

| Invariante | Contraexemplo concreto buscado | Parecer/obrigação atual |
| --- | --- | --- |
| Q-I1 contexto/autorização | Voto de fase/view/config/canal errados, signer duplicado, device revogado autenticado por lookup antigo do backend. | QC tipada, roster e autorização no estado decidido devem rejeitar. Autorização privada compatível comP2 e codec/guardas completas ainda precisam de refinamento; JWT não substitui autoridade. |
| Q-I2 efeito zero ou um | Comando reencifrado/repetido após apagar cache; mesma identidade com outro payload; resposta perdida e retry concorrente. | Dedupe é semântico no histórico completo cliente, não hash de ciphertext. Zero para inválido/não confirmado não é falha de exactly-once; não prometer progresso de toda intenção. Persistência/receipts e vetores independentes pendentes. |
| Q-I3 finais não conflitantes | Aplicar apenas cardinalidade q3, aceitar prepareQC como decide, ou aceitar nó não descendente de justifyQC porque safeNode passou. | F02 está explícito; interseção mínima2 com f1 é fato analítico. Segurança entre views exige TODO núcleo/guardas/locks e hipóteses publicadas; persistência/handovers Beter Life não herdam prova automaticamente. |
| Q-I4 não esquecer voto/lock | Restaurar chave+último decide, perdendo lock/voto ainda não decidido; clone com mesma identidade assina outro ramo. | Q-RECOVER permanece OPEN/P1. Log/WAL íntegro pode ser reconstruído e verificado; backup velho não é equivalente. Nó permanece RECOVERING sem voto até estado suficiente/fencing ou substituição segura; recuperação de chave não o torna “honesto novo”. |
| Q-I5 completude/semântica | Backend omite cancelamento/página/dependência/bytes após fornecer rootN válida; cliente soma prefixo parcial ou trata evento assinado inválido como financeiro. | Materializar prefixo completo/snapshot verificado+suffix e executar regras determinísticas cliente; bytes retidos bloqueiam claim atual. Efeito zero de evento inválido preserva envelope na prova. Aceitação econômica e privacidade de dependências não foram provadas. |
| Q-I6 leitura linearizada | Replay de QC antiga com hora nova; nonce novo assinado junto de head velho de witness isolada; barreira executada mas dados ausentes. | Exigir nonce na barreira decidida em config ativa, lineage e dados completos. A leitura é as-of o ponto, não verdade bancária nem frescor eterno. Nonce sozinho não prova atualidade e dados incompletos não viram saldo atual. |
| Q-I7 continuidade/config/device | Freeze parcial descrito acima; dois sucessores; ACK usado como decide; aposentado/clone volta com config antiga; cliente recebe kit antigo autêntico. | Q-RECONFIG e Q-BOOT/FRESH continuam OPEN/P1. Autoridade de config e seus thresholds/custódia não estão escolhidos; InstallCert não finaliza. Orçamento de corrupção de chaves históricas/aposentadas e bootstrap atual deve ser explícito, sem confiar só em assinaturas antigas. |
| Q-I8 witness versus valor | Três assinaturas ordenam evento de valor/moeda inválidos ou operação indevida; aplicação apresenta QC como validação de finanças/intenção humana. | Witness só atesta bytes/ordem/contexto técnico. Cliente correto verifica semântica completa; assinatura não prova intenção nem benignidade do frontend. Motor, paridade e distribuição continuam pré-condições não demonstradas. |

**Q-PACE OPEN:** há uma referência publicada específica para backoff e líder, não apenas um nome. Entretanto, “progresso se views se sobrepõem” não prova que o refinamento real fornece essa sobreposição. Exemplo: H3 retorna muito atrasada enquanto B retém votos e H1/H2 estão em view alta; NEW_VIEW(from,to=from+1) e coleção de três mensagens da view pertinente não especificam catch-up/salto certificado nem obtenção das mensagens ausentes. É lacuna de integração, não prova de livelock universal do paper. Definir avanço/catch-up sem apagar locks, transições após decide, relógios/timers, limites/overflow e condições de progresso pós-GST; atingir limite e congelar preserva fail-closed, mas não demonstra liveness. Uma bizantina withholding mais uma honesta indisponível deixam somente dois votos.

**A1/Q-BOOT:** A1 é apenas piso/comparação. Backup assinado antigo ou clone pode esconder regressão do detector; timestamp maior não decide entre branches. A1 offline isolada não é trava obrigatória do consenso; novas referências podem vir de canal externo/dispositivo autorizado com prova atual sustentada. Perda de todos mínimos recentes, locks ou confiança na configuração ativa mantém claim atual bloqueado. Chaves de memberships aposentados posteriormente roubadas podem sustentar histórias longas falsas fora de um orçamento histórico explicitado: não presumir que f1 das ativas resolve isso. Definir ameaça ao longo das épocas, atualização/aposentadoria das chaves e mínimo externo suficiente, sem criar autoridade serializadora ou genesis de emergência.

## R35 — cumulatividade, autenticidade e estado

U aleatório32B está aprovado pelo CEO; não é mais escolha pendente nem senha humana. O perfil S/Shamir/HKDF/GCM e domínio literal v1 permanecem, com lifecycle corrigido por F03. Não há demonstração formal/auditoria da composição ou ensaio de custódia.

| Invariante/condição | Contraexemplo concreto | Resultado limitado e obrigação |
| --- | --- | --- |
| R-I1 menos de3 shares | Duas shares, coeficientes enviesados/reutilizados, hashes de shares e tags do kit como verificadores de palpites. | Segredo informacional de Shamir vale só no modelo isolado/uniforme; não para toda composição com verificadores auxiliares. A ressalva atual é correta; biblioteca/interop e análise computacional completas pendentes. |
| R-I2 três partes semU | Custódios obtêm S e kit; U fraco, no mesmo backup ou recuperável por Auth/suporte/mesmos custódios elimina a condição independente. | Perfil exige U forte separado, inclusive fora do dispositivo que pode ser perdido. HKDF/salt/rate-limit não amplificam entropia. Não há bound256bits do sistema só porqueU tem32B; tags/assinaturas/ataque offline exigem análise própria. |
| R-I3 U sem três partes | U roubado com duas shares e verificadores; índice duplicado contado como terceira parte; mistura de setIDs/épocas. | Rejeitar formato/índice/contexto/assinaturas inválidos. Dependência de S não é prova informacional do kit completo nem impossibilidade de toda busca computacional. Futuras tentativas negativas finitas não demonstram segurança universal. |
| R-I4 três partes válidas+U | Share maliciosa, root de kit substituída pelo backend, factor ausente após perda do dispositivo, tag correta de kit antigo. | Kit externo pré-autenticado e contexto devem rejeitar adulteração; positivo requer cliente limpo, todas10 combinações e oráculo independente. Recuperar roots só entra KEYS_RECOVERED_NOT_CURRENT até consenso/lineage/autoridade atuais; Auth não substitui fator nem admite device sozinho. |
| One-shot/backup/rotação | M0 parcialmente regenerado (F03); clone/RNG/registro PENDING retrocedido; antigas3shares+U+envelopes ainda abrem root rewrapped. | Agora abandonar conjunto incompleto inteiro e nunca reutilizar KEK/IV com AAD modificado; tombstones/geração confiável ainda não demonstrados. ACTIVE só por rotação autorizada completa. Rewrap não revoga conhecimento; futuro requer roots novas quando necessário. Perda de todas cópiasU pode ser definitiva, sem bypass. |

Custódio inválido não é automaticamente tolerado por Shamir: obter três partes válidas remanescentes exige disponibilidade real. Nenhum servidor é custodiante privilegiado. Proteção de memória/clipboard/crash reports/backups e o caminho físico deU são obrigações operacionais; a UX descrita não demonstra que usuários conseguem mantê-lo separado e recuperável.

## A3 e O36 — fronteiras e contraexemplos

| Parte | Contraexemplo concreto | Parecer atual |
| --- | --- | --- |
| A3-BOOT | Binário/root/fingerprint vêm só do backend comprometido; instalador malicioso pedeU/shares e confirma sua própria assinatura. | É bootstrap circular. Canal externo já autenticado/updater íntegro e evidência por plataforma são necessários; A3-BOOT permanece OPEN/P1. F04 fecha a dependência explícita de código remoto, não prova plataforma/ausência deRCE. |
| A3-STATE/tempo | Restore de mínimos e relógio permite aceitar metadata assinada velha; mirror retém revogação/update; app usa target/plataforma errada. | TUF1.0.37 fundamenta cadeia/roles/versions/hashes/expiry, não armazenamento/clock anti-rollback da plataforma. Root antiga só verifica a cadeia conforme spec; não concede autorização eterna de target. Estado/tempo/rotina offline e reprovisionamento continuam abertos. |
| A3 compromisso de release | Threshold de targets/root comprometido assina pacote malicioso legítimo; CI ou dependência fora do conjunto verificado recebe plaintext. | Assinatura não prova benignidade. F04 exige conjunto ativo/dependências cobertos; chaves acima do orçamento continuam limite, com incidente/reprovisionamento/rotação de devices/roots. TUF não desfaz exposição anterior. Root/targets2de3 e prazos48h/7d/30d/365d são propostas pendentes, não aprovadas pelo revisor. |
| O36 independência | Quatro fornecedores usam mesmoIdP/admin/CI/cofre/backup; duas instâncias de um domínio votam como duas identidades; aposentado restaura lock velho. | Um compromisso pode ultrapassarf1. Auditoria de acesso transitivo/vendor/incidentes/custódios e fencing exigida; quatro VMs não bastam. Sobreposição com5shares/U/distribuição precisa de análise, não contagem automática de operadores. |
| O36 disponibilidade/DR | Uma bizantina withholding+uma honesta down deixam2; freeze parcial retira honesta adicional; chave+último commit restaurados não recuperam pendências. | Tabelas atuais não prometemSLA, e handover/recovery insuficientes bloqueiam retomada. Adicionar standby não corrige locks/fencing nem cria novo voto. Exercícios/auditoria/monitoramento e reconfiguração são futuros NOT_RUN. |
| O36 custos | USD22,54 ou45,08compute são tratados como total contratável, ignorando trabalho humano, custódia, storage, auditoria/distribuição e termos da quarta oferta. | Fórmulas atuais separam inicial/mensal/eventos e incógnitas; quarta oferta anunciada “a partir de”, não disponibilidade/contrato confirmados. Não revalidei preços. Custo total/SLA/operadores/capacidade continuam NOT_PROVEN e bloqueiam lançamento/orçamento; não provaram inviabilidade universal nem viabilidade. |

P2 ainda precisa autorizar inventário de canal/device/N/roster/compromissos/path/tempo e suas inferências. Sem conciliar verificação e vínculos privados cifrados, a integração continua bloqueada. Open Finance/importações/IA que exijam plaintext em servidor incompatível permanecem BLOCKED; nenhuma dedução sobre internals do Pierre foi feita.

## Conclusão, prioridades e próximo gate

F03/F04 foram resolvidos na especificação e rechecados, não experimentalmente. Q-RECONFIG permanece OPEN/P1 pelo contraexemplo acima; Q-PACE, Q-RECOVER, Q-BOOT/FRESH, A3-BOOT/STATE, privacidadeP2 e composição/custódia operacional R35 continuam dependências materiais abertas. A seleção executiva resolveu a escolha de direção, não essas propriedades. Não mudar4/q3, tornar A1 serializadora, enfraquecerU ou reiniciar estado para fechar achados.

Antes de pedir execução: resolver ou submeter ao CEO a adaptação de handover com prova de segurança E progresso; fechar avanço/catch-up/relógios, restore de locks e orçamento de chaves históricas; especificar autoridades/config e parâmetros de update aprovados; escolher implementações interoperáveis auditáveis e demonstrar bootstrap/P2/lifecycle de recuperação; obter operadores/cotações/total/SLA e plano de auditoria. Os testes T-* precisam de traces/esperados/detectores independentes e autorização futura específica. Não iniciar ensaios para converter lacuna documental em aprovação tácita.

Os originais técnicos Security02–Security04, detalhes financeiros e vetores ainda ausentes continuam NOT_PROVEN; esta revisão não reconstitui experimentos históricos nem paridade integral. MDL13/MDL14 permanecem BLOCKED e Security06 não autorizado. Recomendo próximo gate de resolução documental localizada dos bloqueios e decisões residuais do CEO; esta rodada se encerra como DOCUMENTATION_REVIEWED_NOT_APPROVED, aguardando o CEO.

## Conjunto técnico rechecado nesta rodada

SHA-256 após as correções F03/F04, antes dos estados editoriais finais em README/PRODUCT/E2EE/GATE_RESULT pelo principal. Mudança técnica material posterior exige nova rechecagem. SOURCE_PROVENANCE/GATE_RESULT foram lidos em preparação e não são prova independente de segurança.

| Documento | SHA-256 |
| --- | --- |
| SYNC_AND_INTEGRITY.md | 97E6CD1D79F13E28AB939BA18F1C44B4CA2D2823AF91880E5B7BA1575AF25742 |
| KEY_MANAGEMENT_AND_RECOVERY.md | 4A6AB080ED9D8343A928F4481B06AF45DDFEBF0F6C8161BC4DBEED614D329634 |
| E2EE_ARCHITECTURE.md | 00FF99056BAE0354711CDAC68A099FEF53BE3EA53CE339C69728B5051F05858B |
| SECURITY_GATE_CRITERIA.md | DE5F26C013CD6F0B58D173623410237F2191F7438CD6C75F27385860B8FBADC3 |
| CLIENT_FINANCIAL_ENGINE.md | DD8B1DFA2FE1E2454B513110BF24F78EB02D2E29D1075FC06C7BB51A35B23430 |
| FINANCIAL_PARITY_MATRIX.md | B5D8BE146E9ECD086C33BA1CFB14CA07208428DCB2458E7C63EA2E77CA5BAB90 |
| THREAT_MODEL.md | EF8CC218BAD08DD946BC3EAC6E998E2ED45030EA41CF850B37205194F8F7E909 |
| MIGRATION_IMPACT.md | FCA9F9D3777C43A1DCEFDC1370C6CB993544C62CDD29FFF1614E486E3994B131 |

---

# Histórico — revisão Security05.1 anterior

O parecer abaixo e seus hashes correspondem ao conjunto05.1. Direção ainda não selecionada entreQ23-A/B eU antes pendente são estados históricos superados por05.2; F02 continua resolvido. O histórico não cobre automaticamente esta rodada.

Data: 2026-11-04. Perfil explícito `dev-seguranca`, em sequência após o encerramento do `arquiteto-seguranca`. Esta rodada revisa a especificação nova Q23-A/Q23-B/R35-P/O36, não reutiliza automaticamente o parecer anterior. O revisor alterou somente este relatório existente, preservando os registros anteriores abaixo; não criou subagentes nem executou implementação, PoC ou ensaio experimental.

**Parecer: DOCUMENTATION_REVIEWED_NOT_APPROVED.** Há candidatos concretos e melhor rastreabilidade; não há prova formal do refinamento nem comprovação empírica da composição. Q23, R35 e O36 não ficam fechados por terem recebido especificação. A aceitação da hipótese adicional de A1, a alternativa de quatro domínios, o fator forte de posse e os detalhes operacionais permanecem dependentes de decisão/evidência. Nenhuma política executiva foi alterada pelo revisor. Security05 não foi aprovado; implementação e Security06 não foram autorizados.

## Autoridade, conjunto e método atuais

Li o pedido direto integral do CEO “BETER LIFE — SECURITY05.1 / Preservação documental e especificação dos protocolos críticos”, retransmitido pelo principal nesta delegação; não existe anexo novo. O pedido autoriza exatamente um commit local inicial dos 17 documentos sem alteração e depois especificação/revisão documental, vedando commit adicional e execução experimental. A fonte primária das políticas P2–P6 anteriores permanece o pedido identificado em SOURCE_PROVENANCE.

Git observado: Back `codex/security05-protocols`, HEAD `22ee3b0b959832b1293e37eef217d926a40db3e6`, parent `ceea9e7e95527fa8039283135fc477c84c4ad63b`, exatamente um commit desde o HEAD anterior, um worktree. As modificações atuais são documentação posterior ao checkpoint. Front `codex/agent-team-design-skills`, HEAD `8c8c4f548023aadce4da1aadb0afe2778db0c455`, limpo. Os mesmos 17 arquivos permanecem; política e oito perfis foram comparados iguais. Não repeti a fase1 nem alego ter observado pessoalmente a ordem temporal do staging: sua preservação byte a byte está registrada pelo principal e o commit local é consultável.

Revisados os dez documentos planejados atuais e os registros SOURCE_PROVENANCE/GATE_RESULT em preparação, com foco nas seções Security05.1. Os quatro snapshots financeiros são históricos preservados; Security02–Security04 originais continuam ausentes. Configuração integral permanece NOT_PROVEN aceito; isolamento fino por papel NOT_ENFORCED. Leituras locais e consultas de fontes primárias não são testes do produto/protocolo.

Conferi por leitura [Basic HotStuff v6, Algorithm2](https://arxiv.org/pdf/1803.05069v6), [Shamir 1979](https://web.mit.edu/6.857/OldStuff/Fall03/ref/Shamir-HowToShareASecret.pdf), [RFC5869](https://www.rfc-editor.org/rfc/rfc5869) e [NIST SP800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) nos aspectos relevantes. Essas publicações fundamentam componentes/hipóteses, sem auditar a composição Beter Life. Não pesquisei novamente preços ou Pierre; os preços públicos de compute são fatos de leitura atribuídos ao principal, não cotações ou custos reais certificados pelo revisor.

## Achado de refinamento corrigido nesta revisão

| ID / prioridade | Contraexemplo e consequência | Tratamento e rechecagem |
| --- | --- | --- |
| F02 / P1 para segurança de um refinamento que omitisse a guarda | O resumo inicial de Q23-B mencionava safeNode e comportamento correto do líder, sem explicitar a réplica conferindo descendência da justificativa. Líder malicioso poderia anexar QC válida de view superior de outro ramo a nó não descendente dela; safeNode isolada pode permitir superar o lock pela view. Seguir apenas esse resumo não satisfaria a guarda do Algorithm2, linhas8–10. Não é falha do paper nem execução vulnerável observada. | Principal explicitou na RÉPLICA validação da QC tipada/contextual, quórum/signaturas, descendência m.node→m.justify.node, safeNode e demais precondições/persistência antes do voto. T-Q-B-JUSTIFY ganhou negativo correspondente e positivo ancestral válido. Ambos os trechos foram relidos. RESOLVED documentalmente; execução/formalização NOT_PROVEN. |

Não solicitei outra correção material imediata da proposta. As obrigações abertas abaixo continuam bloqueantes para aprovação técnica, mesmo com F02 resolvido.

## Matriz de contraexemplos — invariantes Q-I1 a Q-I8

Classificação: **A** = fato/argumento analítico limitado às hipóteses; **H** = hipótese adicional ou decisão ainda não aceita; **NF** = refinamento/formalização aberto; **NP** = eficácia empírica NOT_PROVEN. Um ataque que viola uma hipótese explícita mostra seu limite; não é falsificação do lema dentro da hipótese. Nenhum trace foi executado ou model-checked.

| Invariante declarado | Contraexemplo concreto buscado | Resultado adversarial / obrigação de fechamento |
| --- | --- | --- |
| Q-I1 contexto/canal/época/dispositivo | Reusar COMMAND de canalA no B, contar voto de outra época/fase ou consultar autorização antiga após revogação. | Binding criptográfico/contexto e registro atual devem rejeitar. Encoding/domínios foram propostos; regras completas de validação de evento/dispositivo e refinamento ainda NF/NP. Não confiar no lookup de chave fornecido só por Auth/backend. |
| Q-I2 um efeito lógico por comando | Reencifrar comando já aceito após apagar cache “seen”; reutilizar commandID com payload diferente; resposta perdida seguida de retry concorrente. | Dedupe exige identidade/conteúdo canônico e histórico reconstruído, não hash de ciphertext. Formalizar zero para inválido/não confirmado e um para confirmado; não interpretar exactly-once como progresso de todo comando enviado. Sem log confiável, fail-closed. NF/NP; vetor deve medir efeito financeiro, não somente quantidade de envelopes. |
| Q-I3 nenhum checkpoint final incompatível | 2-de-3 simples: {B,H1} certifica X e {B,H2} certifica Y. Em A, clonar A1 ou perder RESERVED/high-watermark permite assinar dois digests. Em B, tomar prepareQC por decide ou omitir a guarda de justificativa introduz refinamento inseguro. | Contagem simples está refutada analiticamente. A-S segue apenas da A1 única, durável, não equivocante e exigida em todo FINAL: A/H, não solução dessas premissas. B precisa do algoritmo/locks/guardas completos, não só interseção3-de-4. F02 corrigido; integração/persistência/reconfiguração NF/NP. |
| Q-I4 restore não reduz estado | A1 reserva X, crash, backup pré-reserva volta com mesma chave e reserva Y. Réplica B volta de backup antigo com lockedQC/votos perdidos e assina ramo conflitante como se fosse honesta nova. | Ambos invalidam o orçamento de honestidade/persistência; não permitir reentrada/reset silencioso. Fencing, proteção monotônica e protocolo de recuperação/handover devem demonstrar preservação ou congelar. RESERVED é irreversível para outro digest; timeout não é abort seguro. Mecanismo real NF/NP. |
| Q-I5 projeção completa e versão/cutoff comum | Após rootN/barrier válida, backend omite envelope de cancelamento ou dependência em uma página; cliente aceita snapshot sem proveniência ou mistura versões. | Inclusão de uma página não prova completude. Cliente deve obter prefixo0..N−1 ou snapshot verificado+suffix integral e executar semântica independente. Bytes podem ser retidos: safety exige bloqueio, liveness depende de disponibilidade ainda não demonstrada. A de binding do compromisso sob primitivas; motor/snapshot/privacy NF/NP. |
| Q-I6 atualidade no ponto da barreira | Servidor assina nonce novo junto de head antigo; A1 restaurada responde novo nonce mas estado retrocedido; réplica isolada devolve “latest” em cache. | Nonce sozinho só impede reutilizar resposta antiga. A exige leitura linearizada de A1 não retrocedida; B exige barreira ordenada/decidida, vínculo a head e consistência mínima. Resultado é as-of nesse ponto, não inexistência de comandos posteriores. Perda de toda referência não pode virar confiança no genesis. H/NF/NP. |
| Q-I7 novos clientes/reconfiguração sem downgrade | Cliente novo recebe genesis/kit antigo autêntico e membership velho; administrador substitui raiz via Auth; nó de reposição inicia época sem handover. | Origem independente autentica raiz E mínimo recente; assinatura antiga não comprova estado atual. Membership fixo não resolve substituição operacional; RECONFIG_FREEZE é limitação correta. Handover, rotação e retomada após perda de âncoras NF/NP e BLOCKED. |
| Q-I8 witness não valida finanças ocultas | Evento assinado/ordenado contém valor inválido, moeda incompatível ou retirada impossível; cliente trata QC como “financeiramente válido”. | Witness atesta bytes/ordem/autorização técnica, não valores. Cliente precisa rejeitar semanticamente, sem aceitar subset como saldo correto. Como processar evento inválido sem travar todo histórico exige refinamento do motor; nenhuma garantia financeira foi demonstrada por HotStuff/AEAD. NF/NP. |

### Safety e liveness dos candidatos, separadamente

**Q23-A:** a unicidade de FINAL é um lema condicional útil, mas não prova fencing/monotonicidade. A1 ativa em TODA finalização e leitura é uma nova autoridade confiável e dependência de disponibilidade, ainda sujeita ao CEO; não é o arquivo pessoal opcional da proposta antiga. Se A1 persistir RESERVED para digest cujos bytes forem perdidos/retidos, não pode trocar digest para destravar. Progresso exige reobter aqueles bytes e votos ou protocolo de recuperação comprovado; essa dependência não desaparece por restart. Uma witness withholding mais outra honesta fora do ar impede q2. Não há promessa de liveness sob partição ou recuperação total de A1.

**Q23-B:** 3-de-4 tem interseção mínima2 e ao menos uma honesta sob f1: fato de conjuntos, não consenso sozinho. Basic HotStuff usa fases e locks; o refinamento deve preservar inclusive a guarda da réplica rechecadas em F02. Safety assume réplicas corretas sem rollback de estado; uma réplica com chave válida e locks apagados não pode simplesmente ser renomeada “honesta recuperada”. Liveness depende de eventual sincronismo/pacemaker e réplicas/dados disponíveis; pacemaker e membership dinâmico permanecem abertos. Quarto domínio é alteração P3/P6 a deliberar, não escolhida pelo revisor. A1 independente/A3 não foram dispensadas. O paper não prova privacidade P2, crash/restore, read barrier Beter Life ou atualização dos clientes.

## Matriz de contraexemplos — R35-P e condições criptográficas

O candidato agora separa S intermediário e U uniforme forte de posse, ambos32B, e roots distintas. O perfil de campo primo, índices/encoding e a derivação/wrapping foram especificados; biblioteca auditável, cerimônias/UX, quotas e prova de composição ainda faltam. Não encontrei razão para rejeitar um IV0^96 apenas por ser fixo quando cada KEK realmente é usada uma só vez; é precisamente a premissa de chave/IV único que precisa sobreviver a crash/clone/restore. NIST trata a unicidade do par chave/IV; não fornece certificado para este ciclo de geração.

| Invariante/condição | Contraexemplo concreto buscado | Resultado / obrigação |
| --- | --- | --- |
| R-I1 privacidade do sharing ideal com <3 | Duas shares conhecidas e manifesto com hashes/assinaturas/tags oferecem verificadores para palpites de S. Coeficientes obtidos por módulo enviesado ou reutilizados entre conjuntos também quebram o modelo ideal assumido. | A privacidade informacional refere-se somente ao Shamir isolado com coeficientes uniformes/canal correto. O kit completo é computacional; texto atual faz essa ressalva. Campo/primalidade/interpolação e geração sem viés precisam de implementação auditável/vetores; composição NP. |
| R-I2 três partes não bastam sem usuário | Três custódios obtêm S e tentam uma senha curta de U offline contra tag; ou U está no mesmo backup ou pode ser recuperado por Auth/custódios. | Esses perfis violam a independência/entropia e são rejeitados explicitamente. U uniforme32B independente é hipótese candidata, não senha memorizável nem garantia256bits do sistema. Tags/assinaturas e composição impõem limites próprios. Aprovação de fator de posse/UX e evidência de separação pendentes; H/NF/NP. |
| R-I3 U sem três partes não recupera | U roubado com duas shares e verificadores do kit permite busca computacional de S; índice duplicado contado como terceira share permitiria reconstrução falsa. | Rejeitar duplicação/codificação/campo/época errados e não anunciar segredo perfeito de todo kit. A combinação deve depender dos dois insumos sob hipóteses computacionais, sem fallback de servidor. Testes negativos finitos não provam resistência a todas as buscas. A limitado/NF/NP. |
| R-I4 três shares válidas+U correto recuperam | Misturar share de outra época/setID/owner; custodiante fornece share falsa; kit cuja public root é substituída pelo backend após perda do dispositivo. | Manifesto externo pré-autenticado, signatures/hashes, contexto HKDF/AAD e pub da autoridade devem rejeitar antes de ativar. Verificação usa public root já fixada, não a private key perdida; M0 sem hash de ciphertext evita ciclo. Interpolação válida é A; todas dez combinações, interop, cerimônia limpa e bootstrap são NOT_RUN/NP. |
| One-shot por KEK e contexto | Clone de RNG/backup repete S/U/salt/envelopeID, mas root ou AAD muda; retry volta a encrypt antes de persistir bytes; propósitos ou setIDs são confundidos. | Mesmo KEK/IV com input diferente viola premissa GCM. Perfil exige retransmissão de bytes, nova geração/época e congelamento se unicidade incerta; persistência/crash ordering e quotas de abertura ainda NF/NP. AAD/info devem distinguir finalidade/owner/época/envelope e ser canônicos, não JSON reserializado. |
| Rotação, perda e bootstrap | Três shares antigas+U antigo+envelopes antigos continuam abrindo a root rewrapped; rootAuthority antiga é reutilizada como autoridade atual após revogação; todas cópias de U são perdidas. | Rewrap não revoga conhecimento; acesso futuro exige roots/época e continuidade novas quando necessário. Kit pode recuperar chaves históricas, não high-watermark/frescor nem autoridade atual. Perda total pode ser definitiva. Protocolos de rotação/atualidade permanecem BLOCKED/NF/NP; nenhum bypass por recovery de U. |

HKDF não amplia entropia, e salt público não substitui o fator. O texto atual não vende o IKM64B como segurança512bits nem a busca genérica por U como bound de todo o sistema. M0/Mfinal e verificadores auxiliares tornam necessária uma análise computacional completa; citar Shamir/HKDF/GCM não a fornece. A escolha de posse forte32B precisa do CEO antes de tratar o candidato como perfil de produto.

## Contraexemplos operacionais O36

| Propriedade proposta | Contraexemplo concreto | Classificação / condição |
| --- | --- | --- |
| Um domínio realmente independente por voto | Três fornecedores distintos usam o mesmo administrador/IdP/CI/cofre; um comprometimento assina com três chaves. Duas VMs no mesmo domínio votam como identidades independentes. | Viola o orçamento de falha, não é proteção adicional. Mapear acesso transitivo/vendor/custódia/distribuição e fencing; NP, operadores não contratados. Três witnesses+cinco shares não aprovam oito operadores nem overlap. |
| Continuidade após falha | Nó morto retorna de backup com chave e lock antigo; incidente remove nó sem handover; recuperação de chave é tratada como recuperação de estado atual. | Não pode retomar assinatura/confirmar apenas porque o processo voltou. Q-I4/Q-I7 e reconfiguração aberta são bloqueios reais; auditoria, monitoramento e procedimento de recuperação independente ainda NOT_RUN. |
| Disponibilidade e custo sustentável | Uma maliciosa withholding e uma honesta indisponível deixam votos insuficientes em A e B; A1 indisponível bloqueia A mesmo com witnesses. Orçamento usa USD18 como custo total e ignora operadores, âncora, backup, distribuição e auditoria. | Tabelas atuais reconhecem esses casos e rotulam USD18/36/18+V4 como compute ilustrativo, sem SLA/capacidade ou gastos reais. Soma aritmética é verificável; sizing, extras, custos humanos, SLA e sustentabilidade NP. Não foi demonstrada inviabilidade universal, nem viabilidade de produção. |

O plano distingue os preços públicos atribuídos ao principal de hipóteses e itens não cotados. Nenhum recurso foi comprado/provisionado; custos de execução dos agentes/ferramentas não foram apurados. Ausência de total aprovado ou de operadores independentes impede lançamento dependente, sem autorizar baixar a política.

## Condições de fechamento e decisões do CEO

1. CEO deliberar hipótese adicional de A1 ativa não-bizantina/fenced ou alteração para quatro domínios/q3, explicitando custo e disponibilidade; não escolher pelo fallback mais disponível.
2. Fechar refinamento por candidato: guardas, persistência/crash/restore, catch-up/bytes, READ_BARRIER linearizada, pacemaker, handover/novos clientes, rotação e congelamento sem referências. Análise independente deve cobrir todos Q-I e distinguir contraexemplo sob premissas de violação de premissa.
3. Deliberar U de posse forte e UX/custódios; escolher implementação auditável compatível com o perfil, fechar geração one-shot/quotas, autenticação do kit e rotação, analisar segurança da composição com os verificadores auxiliares e colusões cruzadas. Não reintroduzir fator fraco ou escrow oculto para facilitar recuperação.
4. Resolver privacidade P2 de canal/N/signers/ids/proofs/links, distribuição A3, regras/vetores financeiros faltantes, operadores concretos, custos totais/SLA e auditoria. Witnesses não validam valor privado e hashes não autorizam publicar o grafo.
5. Somente um gate posterior especificamente autorizado poderá executar provas experimentais com modelos/vetores/oráculos independentes. Todos os testes T-* continuam NOT_RUN; formalização/refinamento e eficácia operacional NOT_PROVEN. Testes não reconstituem os relatórios Security02–Security04 ausentes.

F01 anterior permanece resolvido. Q23 foi refinado em alternativas mas não fechado; R35-P resolve parte da lacuna de especificação, não a aprovação da composição; O36 tem plano/cenários sem operação validada. Recomendo próximo gate de deliberação e fechamento documental, não implementação/PoC/Security06. MDL13/MDL14 continuam BLOCKED. Encerrar esta rodada e aguardar CEO.

## Identidade da proposta Security05.1 revisada

SHA-256 após F02 e T-Q-B-JUSTIFY, antes dos estados editoriais finais pelo principal. Alterações posteriores somente de status/encerramento em README/PRODUCT/E2EE/GATE_RESULT não são prova experimental; mudança técnica material exige rechecagem. SOURCE_PROVENANCE/GATE_RESULT são registros do principal em preparação, não evidência independente do revisor sobre todos os eventos anteriores.

| Documento | SHA-256 |
| --- | --- |
| CLIENT_FINANCIAL_ENGINE.md | 4AB89D359834CD1510488817746E08D6B474606468EAFAC09C3CA4CDA15F9917 |
| E2EE_ARCHITECTURE.md | 71C613661B670688E220DBEA4E6CBD28F0D59811130EF1D81C2E102045711492 |
| FINANCIAL_PARITY_MATRIX.md | 0F704EC619761032F4A49B95CE225526624DFF051B62CCFA2835F02C3201F515 |
| KEY_MANAGEMENT_AND_RECOVERY.md | FAFB80381A016114A736DF19AAEB267925D058ACFC81005A578DA7CD616D8B69 |
| MIGRATION_IMPACT.md | F99E4CFF5347D28BB080D8107E7190F6182FE15EBBF9F1D24FBC010F61833B62 |
| PRODUCT_DECISION.md | B688226CB96293A428918AFED402E1CAEEDC47A4C3D5E2955709FD147CEC2131 |
| README.md | 5DD71BB697BB4260A545220A5932D4D3B9D03CAEF4A994791646260663809155 |
| SECURITY_GATE_CRITERIA.md | 78DD2F47FDD17099BB0239EE8B1B2F2A7CF9EC9AA53B80730998ADED75E2FAE8 |
| SYNC_AND_INTEGRITY.md | EC2E054EA834C1E5DCE1E88A5C5D5D0285AF8742EA50029ECEC50E05F61B24FF |
| THREAT_MODEL.md | 4DF30DC14F5142512D5E95EF7D915556BE8366DD706A574E5476E56583E3E82A |

---

# Histórico — revisão da consolidação executiva anterior

O parecer abaixo pertence ao conjunto anterior a Security05.1. Seus hashes, estados e descrições de lacunas não cobrem automaticamente os novos candidatos. Está preservado como histórico; a revisão vigente é a seção Security05.1 acima.

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
