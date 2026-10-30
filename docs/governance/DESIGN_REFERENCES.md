# Skills de design — instalação local

Estado em 2026-10-29: INSTALLED_LOCAL / RUNTIME_DISCOVERY_NOT_PROVEN.
Autoridade: CEO, "Permissão para instalar skills concedida". Esse gate posterior autoriza a instalação local das duas referências nos dois repositórios; não libera produto, execução de agentes ou outros gates.

| Skill / destino em cada repositório | Origem fixada | Licença |
| --- | --- | --- |
| [ui-ux-pro-max](../../.agents/skills/ui-ux-pro-max/SKILL.md) | nextlevelbuilder/ui-ux-pro-max-skill @ 28b3b8dee8c976df4fa3e94aed4e092ad43fcb03, .claude/skills/ui-ux-pro-max | MIT, LICENSE preservada |
| [design-taste-frontend](../../.agents/skills/design-taste-frontend/SKILL.md) | Leonxlnx/taste-skill @ 12af471f627f866411b4bd785b19646d3672784c, skills/taste-skill | MIT, LICENSE preservada |

Os links acima são relativos à pasta docs/governance e resolvem na raiz do repositório. Fonte imutável: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/28b3b8dee8c976df4fa3e94aed4e092ad43fcb03/.claude/skills/ui-ux-pro-max) e [Taste](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill). Cada pasta contém INSTALL_SOURCE.json com hashes dos arquivos upstream, commit, caminho original e adaptações documentadas. A versão reproduzível é o commit, não o número do CLI/plugin anteriormente observado.

Instalação: helper local skill-installer com --ref SHA, --method download e --dest Front/.agents/skills; cópia verificada para Back/.agents/skills. Não executados npx, instaladores remotos, scripts das skills, gerenciadores de pacotes ou alterações globais. Nenhuma dependência de runtime adicional foi instalada. Código de scripts/data/assets preservado; somente SKILL.md recebeu precedência explícita Beter Life e, na UI UX Pro Max, substituição do path Claude por <repo-root>/.agents/skills/ui-ux-pro-max. LICENSE e INSTALL_SOURCE.json foram acrescentados.

Requisitos presentes: Python 3.14.6; Node 24.18.0; executáveis Chrome e Edge localizados. UI UX Pro Max usa biblioteca padrão Python para buscas; Taste usa Node 22+ e navegador instalado para inspeção, além de rede para buscar imagens. A presença dos executáveis não comprova execução funcional.

## Regras locais

As skills são auxiliares: AGENTS.md, TEAM_POLICY.md e decisões CEO prevalecem. Preservar design system, acessibilidade, responsividade e clareza financeira. Perguntar diante de dúvida relevante, ainda que Taste sugira escolher automaticamente. Ajustes pequenos não autorizam fluxo completo Taste. Sugestões de paleta/layout não autorizam redesign nem mudanças de produto.

Não enviar dados financeiros reais, valores legíveis, chaves ou informações privadas a IA, logs, métricas ou serviços externos. Não inspecionar sessão financeira real nem capturar seus dados. Validar UI com fixtures sintéticas sem informações privadas. Instalação não autoriza PoC, migration, infraestrutura ou publicação.

Antes de eventual execução autorizada, revisar o comando e limitar destinos ao projeto. draw.mjs/app-draw.mjs usam histórico global por padrão: definir TASTE_SKILL_HISTORY para arquivo local autorizado antes de executá-los. Não alterar HOME/CODEX_HOME. inspect/scenes iniciam navegador/servidor local e criam arquivos; assets faz chamadas externas e downloads. Não executar automaticamente. A instalação e revisão estática não certificam segurança desses scripts.

## Validação

PASS: frontmatter e nomes; 116 arquivos por repositório, 232 no total; cópias Front/Back idênticas; hashes de todos os arquivos upstream exceto SKILL.md adaptado; licenças; AST Python, JSON e node --check nos módulos .mjs. Nenhum código de skill foi executado nessas validações estáticas.

NOT_RUN: buscas, sorteio de direção, inspeção de navegador e fluxos de design/produto. NOT_PROVEN: descoberta efetiva pelo runtime Codex e configuração da equipe já registrada no checkpoint. As skills devem ficar disponíveis no próximo turno quando o host recarregar a descoberta do projeto; confirmar a listagem antes de declarar integração operacional PASS.

## Revisão autorizada para commits locais — 2026-10-29

A descoberta das duas skills no catálogo desta sessão Front foi confirmada; os fluxos de design continuam NOT_RUN. Não inferir integração funcional nem execução no Back a partir da cópia estática.

O CEO autorizou remover exclusivamente espaços finais de 46 linhas de scripts/design_system.py da UI UX Pro Max, após a verificação de whitespace impedir o commit. A comparação estática confirmou AST executável equivalente; a única alteração de conteúdo da AST é whitespace de uma docstring. INSTALL_SOURCE.json preserva o hash upstream e documenta a adaptação e o hash SHA-256 local 8a38d68b1499ab539c6bf336f859922896a51e98f19d6c125e982574c4767188. Essa é uma adaptação adicional às mudanças anteriores em SKILL.md; o restante do código/data/assets e as licenças continuam intactos. Nenhum script da skill foi executado.

A versão reproduzível continua sendo o commit upstream fixado mais as adaptações locais documentadas. A revisão não instala dependências, não modifica o produto e não autoriza publicação, Security05, MDL13 ou MDL14.
