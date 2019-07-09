# Vanilla Wiz SSO

Lib js feita em **Vanilla JS** para facilitar o processo de autenticação e renovação de token no SSO da Wiz.

## Preparação da ambiente local

Está api faz uso de [node](https://nodejs.org/en/), para configurar localmente o projeto é necessário executar o seguinte comando, na raiz do projeto:

```bash
> npm install
```

## Organização do projeto

```bash
├── src
    ├── index.js
    ├── lib
        ├── sso-conector.js
```

**index.js** -> Arquivo padrão de exportação da lib.
**sso-conector.js** -> arquivo aonde estão as principais classes do projeto:

* *HttpConnector*: Classe auxiliar que encapsula a complexidade de uma chamada http em modo js puro.
* *SSOConector*: Classe que contém a regra negocial do funcionamento de conexão e renovação de token para o SSO.

## Utilização da lib

Essa lib foi preparada para uso via empacotamento logo ela poderá ser utilizada via importação. Para fazer a instalação do package via npm basta executar o comando:

```bash
> npm install 'git+https://github.com/wizsolucoes/vanilla-wiz-sso.git' --save
```

Para utilizá-la basta importar a classe utilizando o código a seguir:

```js
import SSOConector from 'vanilla-wiz-sso';
```

## Documentação da Classe **SSOConector**

### Instanciando a classe:

Para utilizar os recursos da classe é necessário criar uma instância da classe. Para isso é obrigatório passar um objeto [config](#objeto-config) conforme o exemplo a seguir:

```js
import SSOConector from 'vanilla-wiz-sso';

var sso = new SSOConector(config);
```

#### Objeto Config:

O objeto config deve possuir as seguintes propriedades

* apiPath: url principal do SSO, exemplo: *http://wiz-sso.com.br*
* client_id: cliente id para o SSO
* grant_type: tipo de login a ser executado, exemplo: *passowrd*
* client_secret: chave secreta da api, exemplo: *@#%WESEWqwert==*
* scope: o scope de acesso para qual será utilizado o token gerado
* options: configurações opcionais que podem ou não ser passadas, este campo não é obrigatório.

No campo **options** existem os seguintes campos:

* autoRefreshToken: valor booleano que indentifica se o token deve ser renovado quando expirado, por padrão seu valor é *true*
* ssoTimeout: valor, em millesegundos, que identifica quanto tempo a requisição de login ou renovação de token deve aguardar até considerar que houve um timeout. Por padrão esse valor é 60000 (um minuto).

### Propriedades e metódos da classe:

* **static onAutoRefreshFail** propriédade estática que dispara erro caso a renovação automática de token falhe.

* **static getToken();** método estático que retorna o [token](#objeto-token) do usuário logado, caso o login ainda não tenha sido efetuado retorna null.

* **isLogged();** método da classe que retorna um objeto Promise, no caso do usuário estar logado o retorno do promise será um objeto [token](#objeto-token).

* **loginWithCredentials(username, password)** método que efetua o login do usuário baseado em seu usuário e senha. Retorna um objeto Promise, no caso do usuário estar logado o retorno do promise será um objeto [token](#objeto-token).

* **refreshToken()** método que efetua a renovação do token atual. Retorna um objeto Promise, no caso do usuário estar logado o retorno do promise será um objeto [token](#objeto-token).

* **logOut()** método que remove o token logado do usuário e suspende o controle de renovação de token.


#### Objeto Token

O objeto token é composto das seguintes propriedades:

* tokenType: tipo do **token** retornado pelo SSO, normalmente um token do tipo *Bearer*
* hash: propriamente a cifra do token retornado
* expiresIn: numero em formato *timestamp* que representa o tempo de validade do token.
* refreshToken: hash utilizado para renovar o token.


## Exemplo completo

```js
import SSOConector from 'vanilla-wiz-sso';

// instanciar a classe com os parametros necessários
var sso = new SSOConector({
    apiPath: 'http://wiz-sso.com.br',
    client_id: 'wiz_key',
    grant_type: 'password',
    client_secret: 'af324589+++===',
    scope: 'wiz-corp',
    options: {
        autoRefreshToken: true,
        ssoTimeout: 60000
    }
});

// callback para monitorar o erro ao renovar um token.
SSOConector.onAutoRefreshFail = () => { console.log('vixi...') }

SSOConector.getToken(); // recuperar token caso ele exista.

// verificar se o usuário está logado
sso.isLogged()
    .then({
        token => {
            //logar usuário
        }, error => {
            //erro ao recuperar usuário ou não há usuário logado
        }
    });


// logand usuário
sso.loginWithCredentials('fulano@fulano.com.br', 'senha')
    .then(
        token => {
            //usuário logou
        }, error => {
            // erro ao logar usuário
        }
    );


// renovação de token após logado.

sso.refreshToken()
    .then(
        token => {
            // usuário logado
        }, error => {
            // erro ao renovar token do usuário
        }
    );

// deslogar usuário da sessão

sso.logOut();

```
