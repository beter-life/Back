# Security05 — sincronização, integridade e offline

Proposta, não protocolo executável. Políticas P2/P3/P5/P6 aprovadas; realização técnica de finalização/atualidade permanece bloqueada/NOT_PROVEN. P3 exige A2+A1+A3, ameaça conjunta backend+SQL+Auth+até uma testemunha, meta três domínios/quórum dois; essa meta não comprova propriedades de consenso.

## Unidade e aceitação

Unidade lógica candidata: comando único e conteúdo canônico, owner/contexto, dispositivo/época autorizados, versão de regras, dependências e compromisso do estado anterior, payload cifrado autenticado e autorização sobre seu contexto. P2 mantém conteúdo e relações privadas cifrados; grafo público de dependências ou identificadores correlacionáveis pode violar essa política. Nenhum campo financeiro, índice adicional ou relação privada externo está autorizado pela lista; provar continuidade sem expor vínculos requer desenho compatível e análise. Serialização, assinatura, AAD, nonce e limites aguardam especificação/revisão; jamais derivar identidade financeira de hash público de montante de baixa entropia.

Separar estados conceituais: intenção local → envelope enviado → bytes persistidos → estado verificado → efeito financeiro confirmado. Falha/retry pode repetir transporte sem repetir efeito. Sem prova suficiente, permanecer pendente ou em conflito; não apresentar sucesso financeiro com base em ACK do servidor.

O cliente revalida autorização, dependências, histórico necessário, regras e estado-base antes da confirmação. Transferência e confirmação de Inbox são bundles indivisíveis; referências e efeitos têm aceitação atômica. O servidor pode fazer transação de envelopes/manifestos opacos, mas não valida moeda/valor privado nem substitui a atomicidade lógica verificada no cliente.

## Ataques e resposta proposta

| Ação do atacante | Defesa candidata | Limite que deve aparecer ao usuário |
| --- | --- | --- |
| Mudar bytes, owner, época ou dependência | Autenticação contextual e autorização verificadas antes da projeção | Admin ainda pode persistir bytes inválidos ou negar serviço |
| Inserir evento assinado mas inválido financeiramente | Validação semântica cliente e precondições de estado | Chave/dispositivo comprometido pode representar autorização indevida dentro das capacidades; assinatura não prova intenção humana |
| Omitir página/evento ou dependência | Compromisso de conjunto/ordem e prova de completude contra referência confiável | Prefixo autêntico não prova fim do histórico; cursor do servidor não prova completude |
| Replay ou mesma identidade com payload diferente | Identidade e registro persistente no histórico autenticado; comparação canônica | Cache local apagado não pode reiniciar identidade; recuperação depende de estado confiável |
| Rollback antigo autêntico | Comparar com âncora recente independente, verificar continuidade e épocas | Sem âncora recente não há prova de que snapshot antigo não é atual |
| Forks por dispositivo | Comparação de compromissos, referência pessoal independente e mecanismo futuro de consistência/finalização | Meta 2-de-3 aprovada, protocolo não comprovado; duas assinaturas isoladas podem certificar forks, conforme Q23 |
| Revogação/backup restaurados | Registro de autoridade ancorado e regras de época/ordem | Hora de assinatura declarada não autentica ordem real |

Uma hash chain prova continuidade interna do material apresentado, não ausência de sufixo omitido. Testemunha atesta compromissos de bytes/ordem conforme protocolo, não saldo privado. Definir quem pode atualizar referência, como impedir equivocação, qual referência é recente, como clientes novos a obtêm, como rotacionar chaves e como recuperar sem perder anti-rollback. Não confiar no mesmo banco como única fonte dessas respostas.

## Concorrência e finalização: alternativas abertas

S1: sequência por owner com comando condicionado ao estado-base e referência externa. Facilita invariantes e retry, mas particiona disponibilidade e depende do sequenciador/âncora dentro do modelo aprovado.

S2: DAG de intenções e decisão explícita de conflitos com compromisso final comum. Pode reduzir bloqueios em edições independentes, mas requer regras completas para conflitos financeiros, dispositivos e reversões. Não assumir merge automático de despesas concorrentes ou edição do mesmo candidato.

S3: protocolo de finalização dentro da meta aprovada de três testemunhas independentes/quórum dois, combinado obrigatoriamente à referência pessoal e cliente verificável. Exige especificação analisada de falhas, interseção, comunicação, ordem, rotação, continuidade e disponibilidade. Processos separados não demonstram domínios independentes.

S1/S2 são candidatos de organização das intenções dentro da política, não substitutos das três pernas A2+A1+A3. Nenhum foi selecionado como protocolo final. Não confirmar comandos concorrentes até existir estado final verificável com safety e liveness analisadas; o bloqueio é técnico, não ausência de política P3/P5/P6.

## Q23 — contraexemplo analítico à contagem de assinaturas

Considere B bizantina, H1 e H2 honestas e dois ramos incompatíveis X/Y com o mesmo estado predecessor. B assina X e Y. H1 observa/assina somente X; H2 observa/assina somente Y, sob partição/visões adversariais. Certificados {B,H1} para X e {B,H2} para Y contêm duas de três assinaturas. Sua interseção é somente B. Nenhuma honesta precisou assinar duas vezes; impor “cada honesta não equivoca” isoladamente não impede o conflito.

Este é raciocínio analítico, não execução experimental, simulação ou prova de impossibilidade de qualquer protocolo A2+A1+A3. Refuta a suficiência de promover quaisquer duas assinaturas a finalização. A referência pessoal poderia ter papel adicional, mas sua coordenação/autorização entre dispositivos, disponibilidade e recuperação teriam de impedir o cenário de modo demonstrável, sem assumir que o mesmo estado existe magicamente em todos os clientes.

Aceitação financeira por mera contagem fica BLOCKED para aprovação técnica. Safety: provar que dois estados incompatíveis não podem ser aceitos por clientes corretos sob a ameaça conjunta aprovada, ou delimitar exatamente hipótese adicional autorizada que impede o contraexemplo. Liveness: explicitar condições de rede/disponibilidade, progresso com uma testemunha faltante/maliciosa, tratamento de withholding e efeito do requisito de âncora pessoal; não prometer progresso incondicional em partição.

Obrigações normativas abertas: significado de assinar/preparar/finalizar; logs persistentes e locks de testemunhas; coordenação/visibilidade entre honestas; ordenação por owner e conflitos; prova de inclusão/ausência e frescor; relógio/épocas; novo cliente sem cache; consistência entre dispositivos; bootstrap e perda de A1; rotação/substituição de testemunhas com continuidade entre conjuntos; restauração conjunta de banco e referência; recuperação sem downgrade ou reset da proteção anti-rollback. Nenhuma dessas propriedades foi demonstrada por escolher quórum dois.

Não alterar silenciosamente para quatro testemunhas, quórum três ou outra tolerância. Se a meta não puder ser sustentada, registrar inviabilidade e pedir decisão do CEO. Até protocolo demonstrável e aprovação específica, confirmações dependentes continuam bloqueadas.

## Offline e retomada

P5 permite rascunhos/intencões locais cifradas não confirmadas e consulta a snapshots locais previamente verificados, explicitamente datados/desatualizados. Rascunhos não integram saldos nem relatórios financeiros confirmados. Ao retornar, obter referência atual válida, verificar continuidade completa, aplicar revogações, revalidar regras/associações/cutoff, provas/quórum e confirmar somente sob protocolo válido, ou apresentar conflito para revisão humana; nunca alterar valor/owner silenciosamente para fazer caber.

P5 já foi decidida: sem estado atual verificável, prova válida ou quórum exigido, bloquear confirmação financeira, saldo como atual e Safe to Spend válido. Não aceitar confirmação apenas do servidor. Leitura histórica local verificada requer aviso persistente de data/desatualização e nunca se converte silenciosamente em saldo atual. Timeout, partição ou perda de referência/quórum não permite fallback para confiança exclusiva no backend. Parâmetros de frescor/expiração e UI continuam pendentes tecnicamente, sem relaxar o bloqueio.

## Expiração e retenção

Preservar preview lógico de importação por 24h, seleção explícita e receipts mínimos; relógio/tempo confiável e multi-device devem ser especificados. O baseline limpa fisicamente no acesso posterior, não exatamente às 24h. Em E2EE, exclusão criptográfica e limpeza local/servidor têm limites em backups e cópias já baixadas; não prometer apagamento global. P2 define retenção definitiva de conteúdo e metadados.
