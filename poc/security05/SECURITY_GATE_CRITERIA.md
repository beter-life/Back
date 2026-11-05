# Security05.2 — critérios falsificáveis para validação futura

Estado: planos NOT_RUN; segurança/refinamento NOT_PROVEN; revisão atual pendente. Nenhum teste, PoC, simulação executável ou model-checking foi realizado/autorizado. Este arquivo descreve observáveis e bloqueios, não agenda nem executa Security06.

## Pré-condições e evidência independente

Antes de execução: fechar decisões técnicas/metadadosP2/autoridade de config/update, variantes/formatos/bibliotecas interoperáveis, escopo/ambiente sintético, fontes/versões de regras, operadores e critérios, e receber autorização específica CEO. Não usar DEV como primeiro experimento nem dados reais. Cada caso associa ameaça→premissa→injeção→observação→esperado→limite, com controle positivo/negativo e teste do detector. Oráculo/trace e resultados esperados ficam independentes do próprio motor/protocolo implementado. Logs sanitizados, sem chaves/material de recuperação/plaintext financeiro real.

Núcleo publicado: BasicHotStuffv6 Algorithm1/2/§4.4; guardas contextuais, persistência, read barrier e FREEZE–INSTALL–ACTIVATE são adaptações que precisam de refinamento/prova. TUFspec1.0.37 é base de update, sem provar bootstrap/clock/OS. Shamir/HKDF/GCM isolados não provam a composição/custódia completa.

## Casos Q23, restore e reconfiguração

A Security05.3 registra [casos falsificáveis para o candidato de corte por comando decidido](Q_RECONFIG.md#7-obrigações-de-prova-e-casos-falsificáveis), todos `NOT_RUN`. Os casos abaixo preservam o plano da Security05.2, incluindo o contraexemplo de `FREEZE` parcial.

A Security05.4 registra [casos de autenticidade histórica e continuidade](Q_RECONFIG.md#0548-critérios-futuros-e-classificação), também `NOT_RUN`, incluindo chaves aposentadas, corridas no handover e omissão de envelopes.

| ID futuro | Premissa e injeção | Critério falsificável / limite |
| --- | --- | --- |
| T-Q-TYPED |4roster válido; substituir canal/config/epoch/phase/view/node, duplicar signer, QC2 | Recusar antes do núcleo;3assinaturas só contam no mesmo tuple e roster; controles positivos aceitam QC correta |
| T-Q-B-JUSTIFY (F02) | QCprepare de view superior válida e node em ramo não descendente de justify.node, embora safeNode isolado aceite | Rejeitar proposta pela guarda de descendência independente; positivo ancestral válido satisfaz ambas; não pular por highQC |
| T-Q-VIEWS | Backend+SQL+Auth+1witness maliciosos; líderes/view-change, mensagens tardias/reordenadas, QC de fase anterior | Nenhum final incompatível sob premissas/guards completas; safeNode/locks e typedQC verificados por trace independente, não só interseção cardinal |
| T-Q-PERSIST | Cortar execução antes/depois de cada persistência e voto/NEW_VIEW/decide, reiniciar com log íntegro | Nenhuma resposta dependente antes de durabilidade; mesmo voto retransmitido, locks/view/config/freeze preservados |
| T-Q-OLD-BACKUP | Restaurar só último decide/key, perdendo lock/voto ainda não decidido; clonar disco/RNG/identidade | Nó não vota sem reconstrução comprovadamente suficiente e fencing, ou substituição segura; catch-up de commit isolado NÃO autoriza assinatura |
| T-Q-PACE | Deterministic leader e nextViewbackoff da §4.4, condições pós-GST/overlap e3corretas ativas; depois partição/limite de timer | Progresso apenas sob hipóteses do pacemaker refinado; limite/overflow congela, não prova liveness universal; nunca limpar lock no timeout |
| T-Q-FREEZE-PARTIAL | Uma/duas honestas persistem FREEZE_VOTED antes de decide; líder retém certificado; outra view tenta decidir ramo incompatível com F nãofinalizado; rede depois recupera | Procurar honesta congelada em F e progresso perdido apesar do núcleo permitir decisão posterior. Retransmitir MESMA transição não basta se ela deixou de ser branch admissível; não inventar abort por timeout. Resolver/refinar ou registrar falha material de liveness, nunca classificar guardafreeze como prova completa |
| T-Q-HANDOVER | FreezeCert do antigo conjunto,3INSTALL_ACKnovos eACTIVATE; trocar hashconfig/owner/epoch, oferecer dois sucessores | Verificar autorização/lineage e único terminal,3/4em cada contexto, impedir voto antigo normal e novo normal antes de ACTIVATE; assinatura isolada/ACK não finaliza |
| T-Q-EPOCH-RESTORE | Backup de config antiga após handover, membro antigo volta a assinar, novo cliente recebe cadeia truncada | Manter pisos/estadofrozen e rejeitar downgrade/segundo sucessor; se estado/lineage suficientes perdidos, freeze e não resetAuth/genesis |
| T-Q-BARRIER | READ_BARRIER nonce único, depois replay antigaQC/nonce e latest de servidor ou witnessisolada | Somente barreira decidida/nonce correto no conjunto ativo e lineage atual dá as-of; dadosfinanceiros incompletos ainda bloqueiam saldo/confirmar |
| T-Q-A1 | Referências complementares clonadas/velhas/divergentes e A1offline; cliente novo sem mínimo recente | A1 nunca serializa ou ignora consenso; comparar extensões, divergência congela claim afetado; ausência isolada não inventa dependênciaA1online, ausência total de confiança atual não vira saldo |
| T-Q-COMPLETE | Omitir sufixo/página/cancelamento/dependência/ciphertext, trocar Merklepath/N | Cliente verifica prefixo0..N−1/snapshot+suffix e finanças, recusa soma parcial mesmo com QC válida; witness não prova conteúdo oculto |

Q-PACE/Q-RECOVER/Q-RECONFIG/Q-BOOT são bloqueios de prova/refinamento atuais. Os testes futuros podem falsificar uma implementação/modelo, mas aprovação dependerá também de análise das hipóteses e não reconstituirá os relatos Security02–04 ausentes.

## Casos R35 e experiência de recuperação

| ID futuro | Injeção/cenário | Esperado independente |
| --- | --- | --- |
| T-R-POSITIVE | Roots sintéticas externas fixadas; todas10 combinações de3shares válidas+U32B em cliente limpo/kit externo | Recuperar bytes/pub exatos sem RAM/cofre online residual; verificar interop contra vetores de primitivas e implementação independente |
| T-R-MISSING | <3shares+U,3shares semU,Usem3,Uerrado, U só no device perdido | Não ativar roots; interface informa componente faltante sem Auth/supportoverride; tentativa finita não prova resistência computacional |
| T-R-AUTH-KIT | Índice repetido/yfora campo, shareforjada, setID/epoch/owner/digestM0 trocados; raizkit fornecida pelo backend | Rejeitar material/contexto/assinaturas antes de uso; trustroot precisa de cópia externa previamente autenticada, não privatekey perdida |
| T-R-OFFLINE |3custódios conhecemS/manifest/ciphertext e tentam U; fator fraco, hash/tagverifier, backup conjunto | Análise computacional/entropia e orçamento de tentativa explícitos; não alegar segredo informacional da composição nem rate-limit contra ataqueoffline |
| T-R-NONCE-CRASH | Crash reserva→encrypt→persist; retry com root/AAD alterados; cloneRNG/IDapósrestore | M0 imutável, retry só bytesSEALED idênticos; PENDING de uso incerto abandona o conjunto inteiro e gera novo setID/salt/TODOS IDs/M0/KEKs/ShareRecords/Mfinal coerentes; dúvida de geração congela wrapper |
| T-R-MANIFEST-CRASH | data SEALED, authority PENDING após crash; tentar trocar só IDauthority, reutilizar data antiga ou recifrar data sob KEK/IV antigos com AADnovo | Rejeitar reaproveitamento parcial; novo conjunto completo com contexto/KEKs novos; positivo preserva M0 e retransmite bytes sem encrypt, ou conclui conjunto novo integral; ACTIVE só muda por rotação autorizada |
| T-R-ROTATE | Roubar shares/U/device; rewraprootigual, acesso a kit/envelope antigo e rootAuthorityrevogada | Reconhecer legado acessível; novoepoch/root quando necessário, sem apagamento retroativo; chave recuperada não revive autorização dedevice |
| T-R-UX-CURRENT | Perdadevice comUexterno+3shares, shareinválida, Uperdido, kitvelho e config/minimos ausentes | KEYS_RECOVERED_NOT_CURRENT até lineage/barrier/autoridade vigentes e dados completos; histórico datado apenas se sustentável; perdaU pode ser definitiva |

## Cliente verificável, operadores e paridade

| ID futuro | Injeção/cenário | Critério de reprovação/fechamento |
| --- | --- | --- |
| T-A3-BOOT | Instalador/root enviados só pela origem backend comprometida, hash anunciado pela mesma origem | Não considerar bootstrap confiável; canal externo/root/plataforma precisam de evidência, sem expor U/plaintext a cliente nãoverificável |
| T-A3-UPDATE | Artefato alterado, metadata mix-and-match/versão velha, targetplataforma errada, oldrootsemassinaturasduais | Verificar cadeia TUF, hashes/comprimentos/versões/thresholds+expiry, rootold+new e intermediárias; não executar release rejeitado |
| T-A3-REMOTE-CODE | Binário assinado carrega JS/WASM/plugin/webview/template executável remoto ou config aponta para código fora do manifest; conteúdo remoto solicita plaintext/ponte privilegiada | Rejeitar código/capacidades fora do conjunto de release verificado; backend somente dados não executáveis; positivo usa dependências cobertas pelos hashes/manifest autorizados. Norma não é prova de ausência de RCE |
| T-A3-STATE | Replay de metadata assinada antiga após restore/clonagem local/clockrollback, bináriorevogado | Mínimos/tempo confiáveis por plataforma ou fail-closed/updateexterno; assinatura válida não garante atualidade nem permiterebaixar dados |
| T-A3-COMPROMISE | Mirror/backend/CIcomprometidos; timestampkeyisolada; depois limiartargets/rootcomprometido | Separar adversários: backendnãoimpõe target sem autoridade válida; pacote malicioso validamente assinado acima do orçamento é limite real, exige freeze/reprovision/revogaçãodevice, não promessa TUFabsoluta |
| T-O-DOMAINS |4VM/fornecedores com IdP/root/CI/cofre/admin oubackupcomum; failoverduplo | Não contar4domínios se um compromisso controla>1voto; auditoria de acessotransitivo/incidentresponse e fencing |
| T-O-AVAIL |1nódown;1byzwithholding;byz+outroindisponível; perda de locks em desastre |3corretas podem progredir sob hipóteses;2votos não. Recoverydechave/commitnãoautoriza votar; sem estado suficiente suspender e comunicar |
| T-O-COST/DR | Cotação, sizing, custo humano/storage/custódia/auditoria/monitoring/distribuição; restore isolado e trocaoperador | Total inicial/mensal/eventos com incógnitas reais, orçamento/SLA e operadores aprovados; backup legível não é restoreseguro. Referências22,54/45,08compute não orçamento produção |
| T-P2 | Inferências de canal/device/N/commitments/path/tempo; hashes de baixa entropia e vínculos dedup/matching | Nenhuma relação financeira/índice adicional exposto sem aprovação; privacy de conteúdo não é privacy de grafo |
| T-PARITY | Vetores independentes por fonte/regra/consumidor/moeda/timezone/cutoff; eventoassinadoinválido e páginaomitida | Sem doublecounting/erro monetário/claimatual parcial; matriz financeira preservadaF01. Não usar motor novo como único oráculo nem dados reais |
| T-CONTENT/HOSTED | Futuro isolamentoautorizado: tráfego/dump/memória/logs/cache/export, Auth/JWKS/PG/pooler/TLS/RLS/backup | Qualquer plaintextfinanceiro/DEK/S/U/rootprivada no servidor reprovaP1; localnão prova hosted, nunca DEVcomoexperimento inicial |

## Classificação e condição de parada

Distinguir decisão executiva aprovada, proposta documentada/revisada, argumento analítico condicionado e propriedade formal/empiricamente demonstrada. PASS só serve a critério efetivamente verificado com evidência adequada no ambiente identificado; documentação não dá PASS de segurança. FAIL é violação; PARTIAL cobertura limitada; NOT_RUN não executado; NOT_PROVEN evidência insuficiente; SIMULATED simulação real identificada (nenhuma nesta rodada). Detecção de SQLadulterado não é prevenção de escrita física.

Problemas materiais continuam abertos até refinamento suficiente ou decisão CEO sobre requisito, sem alterar política pela equipe. Não há autorização de implementação/Security06, nem MDL13/14. Próximo gate recomendado: fechar adaptações e parâmetros documentais após revisão; qualquer PoC exige autorização separada.
