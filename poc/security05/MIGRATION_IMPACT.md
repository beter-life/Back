# Security05 — impacto de migração e operação

Somente plano de impacto sob políticas executivas P2–P6 aprovadas. Nenhum código, SQL, migration, mudança hospedada, dependência ou estratégia técnica de release foi implementado/aprovado. Migration0014 e MDL13/14 continuam bloqueados. Política aprovada não resolve viabilidade técnica/financeira.

## Inventário por fronteira

| Área | Mudança candidata para E2EE | Dependência / risco |
| --- | --- | --- |
| API/contratos | Trocar payload financeiro legível e summaries privados por transporte opaco/provas; cálculo/validação cliente | Inventário de todos endpoints/consumidores; novo contrato e compatibilidade versionados em gate separado |
| Banco | Persistir envelopes e estado técnico mínimo; manter owner/RLS/grants para acesso comum | Admin pode alterar bytes; não delegar semântica oculta ao SQL; DDL não proposto neste gate |
| Inbox/import/reconciliation | Parser, mapping, hints, matching e normalização no cliente; persistência cifrada/receipts privados | Preservar lifecycle e limites da matriz; runtime Node não porta automaticamente para navegador |
| Cache/PWA | Estado local cifrado, projeções verificáveis, limpeza por owner/logout e política de desbloqueio | XSS/SO/distribuição comprometidos; sincronização de apagamento e backups não garantem erasure global |
| Logs/metrics/support | Instrumentação sem conteúdo/chaves, suporte por diagnóstico mínimo opt-in futuro | P2 precisa listar campos, retenção e acessos; sem dump real para IA |
| Auth | Preservar sessão/JWT/ownership de serviço; separar E2EE bootstrap/recovery | Reset Auth nunca libera conteúdo ou substitui dispositivo por si só |
| Backup/restore | Cópias cifradas sem material privado operacional; restauração verificável com referência atual independente | Archive legível não é exercício de restore; backup de app não inclui automaticamente Auth/Storage/roles |
| Dados públicos de mercado | Transporte cacheado de taxas públicas/proveniência, cálculo privado cliente | Sem enviar saldos a API de taxas; CURRENT/STALE/UNAVAILABLE e versão da regra |
| Dispositivos/update | P3 exige cliente instalado, assinado e verificável com distribuição/update protegidos independentemente do backend | Requisito aprovado; bootstrap, anti-downgrade, resposta a incidente e protocolo normativo ainda não demonstrados |

## Legado: limites irremovíveis

Recifrar não apaga exposição anterior em WAL, backups, logs, memória, exportações ou acesso administrativo. Revogar/rotacionar não retira conhecimento já obtido. Não prometer confidencialidade retroativa nem assinatura original de eventos que nunca foram autorizados criptograficamente.

Alternativas para baseline inicial: manifesto de histórico/snapshot revisado pelo usuário com proveniência e limites explícitos; reconstrução assistida por fontes financeiras externas; ou abertura nova com referência ao histórico legado separado. São alternativas, não escolha de produto. Não descartar funções/histórico ou inventar cobertura bancária para facilitar a migração. Perdas, cortes e política de dados exigem CEO.

Um manifesto deverá declarar fonte, escopo, regras/cutoff/timezone/moeda, lacunas, hashes de conteúdo autenticado e ato atual de aceitação da baseline. Essa assinatura confirma aceitação atual com limites, não intenção original de cada evento. Sua validação precisa de referência independente e recuperação testável.

## Sequência futura proposta, não autorizada

1. Consolidar políticas P2–P6 já aprovadas, completar detalhes/fontes/regras/vetores e tratar Q23/R35; fechar protocolos e revisão adversarial antes de aprovação técnica.
2. Obter autorização de gate isolado para viabilidade, com dados sintéticos e sem DEV.
3. Comparar motor e consumidores, inventariar plaintext e provar modelo operacional dentro das premissas.
4. Planejar migração/recovery/rollback operacional separado, com autorização e aceite da baseline/legado.
5. Somente após gates específicos, propor mudança de produto/DDL/release ao CEO.

Rollback da aplicação nunca pode reativar caminho plaintext ou diminuir época/estado financeiro já aceito. Uma migração parcialmente realizada precisa de desenho de interrupção e retomada sem dual-write financeiro em claro. Compatibilidade hospedada, desempenho, custos, restauração e fiscalização técnica de E2EE permanecem NOT_PROVEN. Nenhuma etapa é disparada ao concluir a documentação.

## Impacto executivo na arquitetura atual e na UX

O frontend web dinâmico atual não é automaticamente cliente confiável para plaintext; P3 implica novo planejamento documental de instalação, assinatura, verificação inicial/update independente, suporte e recuperação de dispositivos. Isso pode aumentar fricção em onboarding, troca/perda de dispositivo, acessibilidade e uso desktop/mobile; expectativa de UX moderna semelhante ao Pierre não autoriza presumir seus mecanismos internos ou aceitar origem maliciosa.

P3/P6 exigem três testemunhas sob operadores/domínios independentes mais referência do usuário e distribuição protegida. P4 adiciona cinco partes de recuperação3-de-5 mais fator independente; isso não aprova oito operadores distintos nem sua sobreposição. Custos de coordenação, chaves/admin/infra/incidentes, latência, onboarding e exercícios precisam de inventário e estimativas reais. Auditoria independente antes de produção, reavaliação após mudanças críticas, monitoramento/recovery/incident response são requisitos aprovados; fornecedores, orçamento e SLA continuam pendentes, sem contratação.

P5 permite snapshots locais previamente verificados/datados/desatualizados e rascunhos cifrados, não lançamentos confirmados sem referência/prova/quórum. UX deve mostrar explicitamente bloqueio de confirmação, saldo atual e Safe to Spend válido, sem contabilizar rascunhos nos relatórios confirmados. Recuperar disponibilidade não basta: retomada verifica todo estado/protocolo.

P2 cifra conteúdo e relações; preservar índices ou links legados legíveis não é caminho de compatibilidade autorizado. Open Finance, importações e IA que exigirem plaintext em servidor/terceiro incompatível ficam BLOCKED; estudar processamento cliente é permitido documentalmente, implementação/integradores exigem aprovação específica. A migração não pode enviar dados privados a serviço externo para atingir paridade.

Q23 pode impedir aprovar finalização por contagem2-de-3 e R35 impede aprovar recuperação só pelo rótulo3-de-5+fator. Potencial inviabilidade de safety/liveness, usabilidade ou sustentabilidade deve bloquear aprovação/lançamento dependente e ser apresentada ao CEO. Não reduzir meta, retirar fator, trocar quórum ou contratar serviço silenciosamente para viabilizar produto. Segurança máxima é política; possibilidade técnica e operacional permanece a demonstrar.
