# Security05 — políticas executivas e pendências técnicas

Estado documental desta consolidação: DOCUMENTATION_REVIEWED_NOT_APPROVED. Revisão adversarial independente concluída pelo dev-seguranca; Q23/R35 permanecem bloqueios técnicos P1 abertos e O36 risco operacional NOT_PROVEN. Política aprovada não é desenho aprovado, implementação autorizada nem segurança demonstrada.

## Autoridade vigente e precedência

Fonte primária deste gate: pedido executivo “BETER LIFE — SECURITY05 / Decisões executivas P2–P6: política de segurança máxima”, fornecido pelo CEO no anexo `Texto colado.txt`. Autoriza exclusivamente atualizar e revisar os 17 documentos existentes em `Back/poc/security05/`, preservando-os. Não autoriza execução experimental, produto, PoC, migration, banco, infraestrutura, instalação, commit/push/merge/deploy, Security06 ou liberação MDL13/MDL14.

Esta decisão substitui as pendências de política P2–P6 dos relatos anteriores e da proposta inicial. Preserva os fatos históricos e todas as pendências técnicas, experimentais e operacionais não resolvidas. O handoff mestre de 2026-10-29 continua fonte histórica secundária; relatórios técnicos originais Security02–Security04 permanecem ausentes/NOT_PROVEN. Os quatro documentos financeiros recuperados são originais históricos, não evidência atual de implantação. Ver [proveniência](SOURCE_PROVENANCE.md).

P1 continua obrigatório: E2EE para conteúdo financeiro; valores, saldos e resultados legíveis nunca chegam a servidores da aplicação; cálculos exclusivamente em clientes confiáveis; backend/banco guardam envelopes cifrados e não possuem chaves de descriptografia ou recuperação. Auth não equivale a autorização criptográfica. Não confiar exclusivamente no backend para integridade/atualidade; nenhum segredo ou plaintext financeiro em logs, métricas ou IA.

## Políticas aprovadas — estados exatos

```text
P2=POLICY_APPROVED_TECHNICAL_DETAILS_PENDING
P3=THREAT_POLICY_APPROVED_PROTOCOL_NOT_PROVEN
P4=RECOVERY_POLICY_APPROVED_PROTOCOL_NOT_PROVEN
P5=FAIL_CLOSED_POLICY_APPROVED
P6=OPERATIONAL_POLICY_APPROVED_COSTS_AND_OPERATORS_PENDING
```

| Política | Conteúdo aprovado pelo CEO | Detalhes e comprovação ainda pendentes |
| --- | --- | --- |
| P2 — privacidade máxima, alternativa A | Conteúdo financeiro e relações entre registros cifrados; nenhum índice adicional, metadado financeiro ou relação privada exposto sem autorização específica; inventariar e minimizar transporte/Auth, tamanho, frequência, horários, logs, retenção e suporte; avaliar padding proporcional ao risco | Contrato campo a campo, tokenização/compromissos, inferências, padding, retenção, backup e suporte. Nenhuma lista de metadados/índices foi autorizada implicitamente. |
| P3 — ameaças/integridade | Combinação A2+A1+A3: testemunhas independentes, referência sob custódia independente do usuário e distribuição verificável; resistência conjunta a backend+admin SQL+credenciais Auth+até uma testemunha comprometida; meta inicial três domínios e quórum dois; plaintext só em cliente instalado, assinado e verificável com distribuição/update independentes do backend | Protocolo de continuidade, atualidade, autorização, comparação entre dispositivos, finalização/ordem e reconfiguração; defesa 2-de-3 NÃO demonstrada. Contraprova de mera contagem em [SYNC_AND_INTEGRITY.md](SYNC_AND_INTEGRITY.md). |
| P4 — recuperação | Chaves criadas em cliente confiável, proteção local com hardware quando disponível, admissão/revogação/rotação; recuperação independente de Auth; offline 3-de-5 MAIS fator independente de posse/conhecimento do usuário; três custódios não recuperam sem usuário; nenhum custodiante isolado nem backend recupera | Construção criptográfica, entropia e independência do fator, custódios, distribuição/verificação de shares, renovação, composição de dados/autoridade e cerimônias; não basta compartilhar diretamente uma DEK em 3-de-5. Perda de todos os meios pode ser definitiva. |
| P5 — offline/fail-closed | Sem estado atual verificável, prova válida ou quórum exigido: bloquear confirmação, saldo como atual e Safe to Spend válido; não aceitar confirmação só do servidor. Permitir somente snapshots locais previamente verificados com aviso de data/desatualização e rascunhos locais cifrados não confirmados; retomada somente após validação completa | Critérios verificáveis de atualidade, expiração, UX, cache e reconciliação de conflitos; rascunhos não integram saldos/relatórios confirmados. Política já decidida; parâmetros não definidos não permitem fallback. |
| P6 — operação/custos | Três operadores/domínios efetivamente independentes em chaves, administração, infraestrutura/operações e incidentes, com evidência auditável; auditoria independente pré-produção e reavaliação após mudanças críticas; monitoramento, exercícios recovery e resposta a incidentes | Operadores concretos, infraestrutura, custo total, orçamento e SLA a obter/aprovar antes de contratação/produção. Se garantias não puderem ser financiadas/demonstradas, bloquear lançamento dependente, sem reduzir segurança. |

## Problemas graves identificados nesta consolidação

Q23 — **BLOCKED para aprovação técnica de aceitação por contagem**: com testemunhas B maliciosa e H1/H2 honestas, os conjuntos {B,H1} e {B,H2} podem certificar ramos X/Y incompatíveis do mesmo predecessor. B assina ambos; cada honesta assina apenas seu ramo, sem equivocação individual. Ambos têm duas assinaturas. Essa análise refuta a suficiência da contagem 2-de-3 isolada; não é teste nem prova de impossibilidade de toda composição A2+A1+A3. Nenhum mecanismo adicional foi demonstrado. Safety/liveness, coordenação da referência pessoal, clientes novos, perda de âncoras e reconfiguração precisam de especificação e prova. Não trocar silenciosamente para quatro testemunhas ou 3-de-3.

R35 — **BLOCKED para aprovação técnica da composição de recuperação**: 3-de-5 sozinho entrega o segredo compartilhado a três custódios; se for DEK, viola a exigência de participação do usuário. A construção precisa exigir conjuntamente três shares válidas e fator do usuário, sem material equivalente nos servidores/custódios. Fator de baixa entropia pode ser atacado offline por três custódios com material suficiente para verificar palpites. Fator no mesmo backup não é independente. Recuperar esse fator pelo próprio conjunto de custódios/Auth pode reintroduzir bypass. Nenhum algoritmo/KDF/limiar de entropia ou fluxo de recuperação do fator foi aprovado tecnicamente.

Esses problemas não modificam a política executiva. Bloqueiam as conclusões/protocolos dependentes; permitem documentar candidatos e obrigações de prova. Se a meta não for realizável sob premissas explícitas, apresentar ao CEO a incompatibilidade e alternativas antes de alterar requisito.

## Limites e impactos executivos

Não prometer resistência absoluta a dispositivo/SO comprometido, chave de distribuição comprometida, duas ou mais testemunhas em colusão, perda de todas as referências, indisponibilidade ou inferências de metadados. JavaScript malicioso da própria origem não é risco silenciosamente aceito: web dinâmica atual não é cliente confiável automático para plaintext.

Três testemunhas independentes, cinco partes de recuperação, fator separado e cliente instalado impõem custo, coordenação, latência, onboarding, armazenamento/recuperação e acessibilidade ainda não medidos. São funções distintas, não mapeamento aprovado de oito operadores nem autorização de sobreposição; colusão cruzada entre operadores/custódios/distribuição requer análise. São alvos executivos preservados, com potencial inviabilidade econômica/operacional a demonstrar; conveniência não autoriza reduzir o modelo. Expectativa de UX semelhante ao Pierre não é fonte de seus mecanismos internos nem autorização para pesquisá-los/copiar inferências.

Open Finance, importações e IA ficam BLOCKED quando exigirem plaintext financeiro em servidor/terceiro incompatível com P1. Parsing e cálculo em cliente confiável podem ser estudados documentalmente; integrações exigem arquitetura compatível e aprovação específica.

## Próximas deliberações e separação dos estados

A política executiva está aprovada. O desenho técnico permanece proposto/NOT_PROVEN; a revisão independente desta consolidação foi realizada e está em INDEPENDENT_REVIEW.md. Q23/R35 continuam tecnicamente não aprováveis no estado atual, O36 permanece aberto, e nenhuma segurança foi demonstrada. A revisão anterior identifica somente o conjunto anterior. Após o parecer atual, este documento recebeu apenas atualização editorial do estado, sem mudança técnica.

Perguntas residuais ao CEO após análise: quais campos de transporte/Auth inevitáveis e inferências residuais serão autorizados; quais operadores/custódios e quais custos/SLA concretos serão aceitos; qual resposta executiva se a composição 2-de-3 ou 3-de-5+fator se mostrar incompatível com as metas? As partes dependentes permanecem bloqueadas sem inventar resposta. Próximo gate recomendado: fechamento documental dos protocolos, análise de safety/liveness e recuperação composta, com revisão adversarial e aprovação humana posterior. Nenhuma PoC ou Security06 automática.
