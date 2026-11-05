# Security05.2 — fechamento documental condicionado

Data: 2026-11-04. Estado: REVISION_PENDING_INDEPENDENT_REVIEW. Autoridade: pedido CEO Security05.2 no anexo identificado por hash em [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). Somente atualização documental; nenhum commit, teste experimental, PoC, migration, código, instalação, infraestrutura ou publicação autorizado. Status máximo DOCUMENTATION_REVIEWED_NOT_APPROVED; Security05 não está aprovado para implementar e Security06 não foi autorizado.

## Estado inicial e preservação

Back confirmado em codex/security05-protocols, HEAD22ee3b0b959832b1293e37eef217d926a40db3e6, um worktree, 13 documentos autorais modificados sem staging e quatro fontes históricas originais preservadas. Front em codex/agent-team-design-skills, HEAD8c8c4f548023aadce4da1aadb0afe2778db0c455, um worktree e limpo. Política/checkpoint e oito perfis comuns comparados iguais. O commit inicial de preservação é preexistente: não foi repetido. Nenhum reset, checkout, rebase, limpeza ou operação Git de escrita neste gate.

Os 17 documentos existentes são preservados. Arquiteto-seguranca refina os dez documentos autorais planejados; principal mantém SOURCE_PROVENANCE/GATE_RESULT; dev-seguranca atualizará INDEPENDENT_REVIEW somente após o arquiteto encerrar. Um subagente ativo por vez. Políticas compartilhadas, PROJECT_STATE, produto e fontes históricas não são alterados.

## Decisões aprovadas e alcance técnico

O CEO selecionou quatro testemunhas independentes/q3/HotStuff com até uma bizantina e comprometimento conjunto adicional de backend/SQL/Auth. A1 é referência pessoal complementar, sem serializar obrigatoriamente transações ou dispensar consenso. Selecionou também fator U aleatório32B na recuperação cumulativa Shamir3-de-5 + U, HKDF-SHA256/AES256GCM, e quatro domínios operacionais. A aprovação é de direção arquitetural, não de refinamento formal, execução experimental ou produção.

Refinamento deve explicitar consenso entre views, pacemaker, durabilidade, reconfiguração, admissão de novos clientes, restauração antiga e leitura com provas. Qualquer adaptação de HotStuff publicado precisa de identificação e obrigação de prova; não afirmar que três assinaturas ou assinatura antiga bastam. A1 não pode voltar silenciosamente ao papel de autoridade serializadora.

R35 precisa de formatos, contexto, nonces, versões, rotação, kit autenticado, independência do fator após perda de dispositivo e fluxo de recuperação/UX. Três partes sem U, U sem três partes, login/reset/Auth ou backups conjuntos não podem ser atalhos de recuperação. Recuperação de chaves não comprova atualidade; perda definitiva de U é risco explícito.

A3 deve tratar bootstrap de confiança fora do backend, assinaturas e versões de artefatos, atualização/anti-downgrade, rotação/revogação e comprometimento de distribuição. HTTPS/CSP ou assinatura isolada não demonstram todo o sistema. Se não há solução demonstrável, a distribuição permanece bloqueio técnico.

O36 deve separar quatro operadores/domínios em credenciais, chaves, infraestrutura, administração e incidentes, incluindo falhas de fornecedor/IdP/CI comuns e recuperação de desastre. Quatro VMs do mesmo operador não são quatro domínios independentes. Custos são separados por categoria e por cenário; tarifas públicas não são contratos, dimensionamento demonstrado ou orçamento/SLA aprovado.

## Revisão e resultados ainda pendentes

Revisão independente atual pendente. As revisões Security05/05.1 são antecedentes, não cobertura automática desta rodada. O revisor buscará contraexemplos concretos por invariante, inclusive falha entre views/reinícios/épocas, backups, componentes ausentes, cliente malicioso, assinaturas antigas e falsa independência. Problema material permanece aberto até resolução ou submissão ao CEO.

Configuração integral efetiva continua NOT_PROVEN, limitação anteriormente aceita; nenhum controle modificado ou diagnóstico falho repetido. Originais Security02–Security04 seguem ausentes; handoff é fonte secundária. Segurança operacional, composição criptográfica, prova de refinamento, paridade integral, desempenho e distribuição confiável ainda não demonstrados: NOT_PROVEN. Ensaios futuros NOT_RUN. Os critérios em SECURITY_GATE_CRITERIA não autorizam execução.

## Encerramento

Registrar após revisão o parecer atual, problemas abertos, critérios falsificáveis, custos/hipóteses e Git final. Nenhum arquivo histórico será reescrito ou commit criado para encerrar este gate. MDL13/MDL14 continuam BLOCKED. Próximo gate somente será recomendado, sem avanço automático; aguardar CEO.
