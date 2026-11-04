# Security05 — chaves, dispositivos e recuperação

Políticas P3/P4/P6 aprovadas pelo CEO; desenho/protocolo de recuperação proposto e NOT_PROVEN. Estado exato: P4=RECOVERY_POLICY_APPROVED_PROTOCOL_NOT_PROVEN. Não contém chaves, segredos ou instrução de provisionamento; nenhum ensaio foi executado.

## Domínios separados

Identidade Auth permite acesso ao serviço; autoridade criptográfica permite admitir/revogar dispositivos e autorizar épocas; chaves de dados permitem descriptografar conteúdo; assinatura de distribuição autentica software. Não reutilizar esses domínios como atalho. Reset de senha/JWT válido não recupera conteúdo nem pode substituir raiz ou cadastrar dispositivo sozinho.

O bootstrap deve estabelecer uma raiz confiável fora de material substituível pelo backend, em cliente instalado/assinado/verificável com distribuição independente. Candidatos técnicos a especificar: canal externo/kit offline, dispositivo já confiável e custódia independente dentro da política 3-de-5+fator do usuário. TOFU puramente fornecido pelo backend não demonstra a resistência conjunta exigida. A política já foi escolhida; bootstrap, vinculação de raiz e novo cliente continuam bloqueados para aprovação técnica até especificação e prova.

## Ciclo proposto de dispositivos

1. Novo dispositivo cria material em cliente confiável e protege localmente as chaves, usando mecanismos de hardware quando disponíveis; apresenta desafio/identidade por canal autenticado a especificar. Hardware não elimina comprometimento do SO nem prova distribuição confiável.
2. Autoridade existente válida confirma explicitamente owner, chave, capacidades, época e contexto; o registro de admissão integra histórico verificável.
3. Transferência de acesso a dados usa mecanismo criptográfico revisado entre partes autorizadas, sem DEK disponível ao transporte/servidor. Pareamento precisa resistir a troca de chave, MITM, replay e owner errado.
4. Cada comando liga dispositivo e época ao estado-base. Cliente consulta registro de autorização/revogação consistente com a referência atual; certificado isolado antigo não basta.
5. Revogação registra evento e nova época; conflitos de comandos concorrentes à revogação obedecem ordem final aprovada. Relógio alegado pelo dispositivo não pode fazer assinatura nova parecer anterior à revogação.

Revogar não apaga plaintext já visto, cópias locais ou chaves antigas. Rotação pode limitar acesso futuro; exclusão efetiva de acesso antigo e migração de ciphertext exigem análise própria. Persistência do registro após reinícios/restore precisa de prova de atualidade independente do banco.

## Política executiva de recuperação e composição R35

O CEO adotou como desenho inicial offline 3-de-5 MAIS fator independente de posse/conhecimento do usuário. Nenhum custodiante isolado, backend ou simples colusão de três custódios pode recuperar sem o usuário. Recuperação de dados e de autoridade continua separada de Auth e precisa de protocolos próprios. Essa política substitui as opções ainda abertas da proposta anterior; não é aprovação da construção criptográfica.

**R35: composição ainda BLOCKED para aprovação técnica.** Dividir a própria DEK em cinco shares com limiar três entrega a DEK a qualquer conjunto de três e viola a segunda condição. Exigir participação do usuário só em uma tela, no servidor ou em procedimento administrativo também não impede essa colusão. O sistema precisa fazer a recuperação depender criptograficamente de três shares válidas E do fator independente. Descrever uma conjunção desejada não demonstra uma construção segura.

Candidatos documentais, ainda sem seleção de algoritmo: compartilhar acesso a material que continue criptograficamente protegido pelo fator independente; ou protocolar recuperação interativa que exija ambos sem revelar material reutilizável que dispense um deles. Cada candidato precisa de análise de composição, autenticidade, separação de domínios e resistência offline. Nenhuma KDF, formato, algoritmo de sharing, parâmetro de entropia ou cerimônia foi escolhido/aprovado tecnicamente neste gate.

Se o fator for senha curta ou previsível, três custódios que reconstituam um artefato com verificador de palpites podem tentar força bruta offline. Não afirmar resistência apenas por existir KDF ou rate limit de servidor. O desenho deve demonstrar entropia/proteção efetiva contra o adversário e tratar os limites de disponibilidade de fatores de posse/hardware. Não pedir fator real ou material de recuperação no chat.

Independência deve permanecer em criação, armazenamento, exportação, backup, restauração, renovação e suporte. Copiar fator e shares para o mesmo backup/domínio elimina independência. Um fluxo que recupera o fator pelo mesmo conjunto de três, por Auth ou por backend reintroduz bypass; qualquer recuperação alternativa do fator precisa preservar a conjunção e limites de colusão, não criar chave-mestra oculta.

Três testemunhas e cinco partes de recuperação são funções distintas, não comprovação de oito operadores nem autorização de sobreposição. Mapear custódios, operadores, hardware, credenciais e backups e analisar colusões cruzadas antes de aceitar a topologia. Revisar distribuição verificável de shares, autenticidade/owner/época, detecção de share incorreta, renovação, revogação de material exposto, disponibilidade de pelo menos três partes e participação real do usuário.

Pareamento com dispositivo ainda autorizado é complementar, sem substituir recuperação em perda total do dispositivo. Uma recuperação completa de chaves não recupera por si só a referência de histórico mais atual. Perda de todas as partes/fatores necessários pode ser definitiva; nenhum bypass oculto por suporte/Auth/servidor é permitido. A política comunica essa consequência possível, sem prometer recuperar perda total.

## Cerimônia e verificações futuras

Plano: registrar inventário sem material secreto, custódios, épocas, procedência de cliente e referência atual; destruir acesso aos dispositivos/chaves online em ambiente isolado sintético; recuperar com fatores guardados independentemente; verificar histórico completo e autorizações; rotacionar e revogar material exposto; comprovar continuidade em segundo dispositivo limpo. Cada etapa exige dono e evidência sanitizada, não realizada aqui.

Negativos indispensáveis: menos de três shares com fator correto, três shares sem fator, fator errado/baixa entropia, custodiante comprometido/colusão, envelope adulterado, owner/época incorretos, backup antigo autêntico, fator no mesmo backup, bypass pela recuperação do fator, dispositivo revogado, MITM, credencial Auth roubada, servidor substituindo raiz e perda de todas as âncoras. Positivo: três shares válidas e fator correto recuperam em cliente limpo sem dispositivo/cofre online residual, somente sob protocolo revisado e estado sustentado. Restaurar backup financeiro não prova atualidade nem recuperação de Supabase/Auth/Storage. Na ausência de referência atual/prova/quórum, P5 bloqueia confirmação, saldo atual e Safe to Spend válido.

## Viabilidade e obrigações de prova

Documentar propriedades separadas: confidencialidade contra custódios/servidor; recuperabilidade com perda de dispositivo; autenticação e continuidade de autoridade; disponibilidade de partes/fator; UX de criação, teste, renovação e recuperação. A exigência 3-de-5+fator pode impor fricção e custo incompatíveis com o uso esperado; medir só em gate futuro autorizado. Se inviável, registrar bloqueio e devolver ao CEO, sem reduzir limiar, remover fator ou permitir escrow silenciosamente. Evidência física/administrativa independente e exercício de recuperação são futuros NOT_RUN; arquivo pré-provisionado/RAM não demonstra custódia offline.
