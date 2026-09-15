# Materiais por obra

Esta atualização usa os 94 modelos da planilha Materiais implantação Vivo.

## Uso
- Abra Cadastrar obra ou Editar, em qualquer uma das seis categorias.
- Em Materiais aplicados, clique em Adicionar material.
- Escolha o modelo na lista, a medida (un ou m) e preencha a quantidade, inicialmente em branco.
- Adicione outras linhas, inclusive com o mesmo modelo.
- Consulte os totais por modelo e medida durante o preenchimento e, após salvar, na coluna Materiais aplicados.
- Relatórios consolida os materiais das obras filtradas e inclui os resultados no CSV.

A planilha não informa unidade de medida. Por isso cada lançamento exige escolher un ou m; comprimentos contidos no nome do modelo não são convertidos automaticamente.
Os códigos da planilha identificam os modelos internamente, mas não aparecem nas listas, resumos ou exportações de materiais.
Unidades aceitam inteiros positivos; metros aceitam até três casas decimais. Limite: 500 lançamentos por obra e 1 bilhão por lançamento.

## Obrigatoriedade
Como os status atuais da obra são Pendente, Em andamento e Concluída, foi criada uma configuração separada: Preenchimento dos materiais, com Opcional ou Obrigatório.
O gestor define essa configuração por obra. Obrigatório exige ao menos uma linha completa ao salvar, independentemente do andamento. Empresas não podem desativar a exigência. Linhas adicionadas precisam estar completas mesmo quando o preenchimento é opcional.
Obras anteriores começam como opcionais. Esta regra não é automaticamente vinculada à conclusão da obra.

## Ativação
1. No SQL Editor do projeto Supabase existente, execute supabase/04-materiais.sql após as migrações 01, 02 e 03 já existentes. Não reexecute o schema 01 em uma base já configurada.
2. Depois da execução bem-sucedida, integre esta alteração na main.
3. Aguarde Render e Vercel concluírem a publicação e abra Obras > Editar.
4. Faça um lançamento de teste, salve e reabra a obra para confirmar os totais.

O SQL é transacional e pode ser reexecutado. Preserva as obras existentes e suas políticas RLS. Os materiais são salvos na mesma linha da obra, junto com a edição, evitando salvamento parcial. A view continua com security_invoker.
A API lê o catálogo com o token do usuário. As validações de modelo, quantidade e obrigatoriedade também são executadas por trigger no banco.

## Validação
- node --test backend/test/materiais.test.mjs
- npm --prefix frontend install e npm --prefix frontend run build
- Teste de banco: instale @electric-sql/pglite em um diretório temporário e execute PGLITE_MODULE=/caminho/absoluto/node_modules/@electric-sql/pglite/dist/index.js node backend/test/materiais-db.test.mjs

O teste de banco executa as migrações com usuários de teste isolados. Verifica reexecução, 94 modelos, persistência, repetição, isolamento por empresa, bloqueio no primeiro acesso, proibição de a empresa desativar obrigatoriedade e rejeição de materiais inválidos por SQL direto.
