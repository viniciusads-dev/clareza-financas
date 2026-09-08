# Planejamento de evolução — Clareza

O Clareza deve continuar simples no dia a dia, mas evoluir como uma base confiável para muitos anos. A ordem abaixo prioriza o momento de vida do usuário: quitar dívidas e organizar o fluxo primeiro; reserva e investimentos só depois.

## Fase 1 — Confiabilidade e controle da própria conta

**Objetivo:** deixar o dado financeiro recuperável, auditável e fácil de administrar.

| Melhoria | Resultado esperado | Prioridade |
| --- | --- | --- |
| Tela “Segurança e API” | Criar, nomear, copiar uma vez, listar e revogar tokens sem precisar chamar endpoint manualmente. | P0 |
| Exportação completa + importação com prévia | CSV/JSON de todas as entidades, validação, mapa de colunas e reversão do lote recém-importado. | P0 |
| Auditoria e desfazer | Histórico de criação/edição/exclusão com data, origem e recuperação de um lançamento excluído. | P0 |
| Fechamento mensal | Congelar a visão de um mês, comparar planejado x realizado e abrir o mês seguinte sem reconfigurar tudo. | P0 |
| Segurança operacional | Monitoramento de erros, alertas de falha, rotação/revogação em massa de tokens e testes de autorização no pipeline. | P0 |

**Critério de saída:** você consegue recuperar seus dados, saber o que mudou e usar a API sem expor um token.

## Fase 2 — Sair do registro manual sem perder clareza

**Objetivo:** diminuir o esforço recorrente, o principal ponto de abandono para quem tem TDAH.

| Melhoria | Resultado esperado | Prioridade |
| --- | --- | --- |
| Lançamentos recorrentes | Aluguel, faculdade, assinaturas e salário gerados como previsão, com confirmação simples. | P1 |
| Calendário e lembretes | Avisos discretos de vencimento e de “3 dias sem registrar”, configuráveis e sem excesso de notificações. | P1 |
| Categorias personalizadas | Criar, ocultar, reordenar e dividir categorias/subcategorias. | P1 |
| Anexos e comprovantes | Guardar recibos de despesas relevantes, com permissão e limites explícitos. | P1 |
| Busca e filtros avançados | Período livre, tags, faixa de valor, conta e situação, com exportação do resultado. | P1 |

**Critério de saída:** a maior parte do mês aparece automaticamente como previsão e exige só confirmação/correção.

## Fase 3 — Quitar dívidas antes de investir

**Objetivo:** transformar o painel em um plano de saída das dívidas, não em mais uma lista de gastos.

| Melhoria | Resultado esperado | Prioridade |
| --- | --- | --- |
| Módulo de dívidas | Credor, saldo, juros/CET, vencimento, parcela mínima e status de negociação. | P0 |
| Simulador avalanche/bola de neve | Mostrar qual dívida atacar primeiro, prazo estimado e economia de juros. | P0 |
| Plano de pagamento mensal | Reservar valor realista para dívidas antes de metas opcionais. | P0 |
| Indicador de nome limpo | Marcos visuais: regularizar atrasos → quitar dívidas → criar reserva. | P1 |
| Investimentos bloqueados por regra | A seção aparece bloqueada enquanto houver dívida ativa; exibe a próxima condição para liberar. | P0 |

**Critério de saída:** o usuário sabe o valor mínimo, a próxima dívida e o mês projetado para se regularizar.

## Fase 4 — Reserva, patrimônio e integrações

**Objetivo:** depois das dívidas, orientar uma construção de patrimônio sem transformar o app em uma corretora.

| Melhoria | Resultado esperado | Prioridade |
| --- | --- | --- |
| Reserva de emergência | Meta baseada em meses de custos essenciais e evolução por aportes. | P1 |
| Visão de patrimônio | Contas, reserva e investimentos, com histórico de aportes e rentabilidade separada. | P2 |
| Open Finance | Conexão somente por consentimento, leitura inicialmente, reconciliação e botão para desconectar. | P2 |
| Integrações por webhook/API | Chaves com escopo, limite, logs e revogação para automações pessoais. | P1 |
| Importadores bancários | OFX/CSV com deduplicação e fila de revisão antes de gravar. | P1 |

**Critério de saída:** a reserva é acompanhada com segurança e integrações não criam lançamentos silenciosos.

## Fase 5 — Uso compartilhado e maturidade de plataforma

**Objetivo:** preparar o produto para casal/família sem misturar dados por acidente.

| Melhoria | Resultado esperado | Prioridade |
| --- | --- | --- |
| Espaços pessoais e compartilhados | Separar “meu dinheiro”, “nossas contas” e permissões por pessoa. | P2 |
| Convites e papéis | Proprietário, editor e visualizador, com revogação e auditoria. | P2 |
| Autenticação independente | Se o app sair do ambiente privado atual: provedor de identidade, MFA, recuperação de conta, sessões e rate limit de login. | P2 |
| LGPD e ciclo de dados | Exportar, apagar conta, retenção, política de privacidade e registro de consentimento. | P1 |
| Backup/restauração automatizados | Teste periódico de restauração e objetivo de recuperação documentado. | P1 |

## Indicadores para decidir o próximo passo

Antes de adicionar funcionalidades grandes, medir:

- dias com pelo menos um registro;
- percentual de lançamentos recorrentes confirmados;
- despesas sem categoria;
- contas vencidas por mês;
- saldo destinado a dívidas versus reserva;
- uso de tokens, falhas e tentativas não autorizadas na API.

Se o registro diário continuar baixo, priorizar reduzir atrito e não adicionar mais gráficos. Se houver registros consistentes por dois ou três meses, priorizar dívidas e fechamento mensal.
