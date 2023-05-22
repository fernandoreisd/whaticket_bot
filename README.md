# Whaticket Bot
Whaticket bot com customizações

# Ambiente de Desenvolvimento
A branch `development` foi criada para fins de testes. Ou seja, todo código implementado, será mergeado para ela e assim testada localamente (a princípio). Quando aprovado o teste será mergeado o
novo PR para a branch `main`.

## Adicionando código (merge) na branch de desenvolvimento
É importante que seja feito um `git pull` antes de mergear, pois assim garantimos que o código estará atualizado antes de adicionar novos e não sobreescreva nenhum de forma indesejada.

Para adicionar novos códigos na branch de `development` você pode seguir os seguintes passos:
1. `git checkout development`
2. `git pull`
3. `git merge <nome-da-branch-que-você-criou-e-quer-mergear-na-development>`
4. `git push`

## Passo a passo para testar localmente
```sh
# caso não tenha a branch no seu local faça: git fetch --all
git checkout development
git pull
```
### Start Frontend
1. `cd frontend`
2. `nvm use 14` - Usamos aqui o node 14, pois há libs que não rodam com a versão mais nova do node (algo que ainda será revisto)
3. `npm install`
5. `npm start`

### Start Backend
Para o backend é necessário o arquivo `.env`. Consulte um dos devs e peça as credenciais em clound
1. `cd backend`
2. Copie o arquivo `.env.example` e renomei para `.env`. Em seguida pegue as credencias do servidor em clound com um dos devs. Atenção: Caso não tenha esse arquivo `.env.example`, crie o `.env` normalmente.
3. `npm install`
5. `npm run dev:server`

#### Rodando o backend localmente
Você pode querer usar o banco de dados localmente. Para isso será preciso:
1. Configurar o `.env` com as credencias do seu banco local
2. `npm run build` - Para gerar o arquivo `index.js` da pasta sequelize.
3. `npx sequelize db:create` - cria o seu banco de dados
4. `npx sequelize db:migrate` - roda as migrates
5. `npx sequelize db:seed` - popula com as seeds
6. `npm run dev:start`

