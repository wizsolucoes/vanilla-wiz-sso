export class SSOConector {

    static setToken(_token) {
        SSOConector._token = {
            tokenType: _token.token_type,
            hash: _token.access_token,
            expiresIn: (_token.expires_in * 1000) + SSOConector._getCurrentTime(),
            refreshToken: _token.refresh_token
        }

        window.localStorage.setItem("auth_data", JSON.stringify(SSOConector._token));
    }

    static getToken() {
        return SSOConector._token;
    }

    constructor(config) {
        if (!config.options) config.options = {};
        if (!config.options.tokenAutoRefresh) config.options.tokenAutoRefresh = true;
        if (!config.options.ssoTimeout) config.ssoTimeout = 60000;

        this.apiPath = config.apiPath;
        this.client_id = config.clientID;
        this.grant_type = config.grantType;
        this.client_secret = config.clientSecret;
        this.scope = config.scope;

        this.autoRefreshToken = config.options.tokenAutoRefresh;
        this.ssoTimeout = config.options.ssoTimeOut;

        this._ctrlRefreshInterval = null;
    }

    _startAutoRefreshToken() {

        if (this.autoRefreshToken) {
            if (!this._ctrlRefreshInterval) {
                var timeout = SSOConector._token.expiresIn - (SSOConector._getCurrentTime() - 120000);
                this._ctrlRefreshInterval = setTimeout(() => {
                    this._tryRenewToken();
                }, Math.max(timeout, 0));
            }
        }
    }

    _tryRenewToken() {
        this.refreshToken()
            .then(_ => {
                clearTimeout(this._ctrlRefreshInterval);
                this._ctrlRefreshInterval = null;
                this._startAutoRefreshToken();
            }, _ => {
                SSOConector.onAutoRefreshFail && SSOConector.onAutoRefreshFail();
            });
    }

    static _getCurrentTime() {
        return new Date().getTime();
    }

    setAutoRefreshToken(enabled) {
        this.autoRefreshToken = enabled;
    }

    isLogged() {

        return new Promise((resolve, reject) => {

            var data = window.localStorage.getItem("auth_data");

            if (data) {

                var tokenData = JSON.parse(data);
                var currentTime = SSOConector._getCurrentTime();

                SSOConector._token = {
                    tokenType: tokenData.tokenType,
                    hash: tokenData.hash,
                    expiresIn: tokenData.expiresIn,
                    refreshToken: tokenData.refreshToken
                }

                if (this.autoRefreshToken) {
                    if (SSOConector._token.expiresIn >= currentTime) {
                        this._startAutoRefreshToken();
                        resolve(SSOConector.getToken());
                    } else {
                        this.refreshToken()
                            .then(
                                token => { this._startAutoRefreshToken(); resolve(token) },
                                _ => { reject('Não foi possível renovar o token antigo!') }
                            );
                    }
                }
            } else {
                reject('Não há token');
            }
        });

    }

    loginWithCredentials(username, password) {

        return new Promise((resolve, reject) => {
            new HttpConnector(this.ssoTimeout)
                .request(
                    'post',
                    `${this.apiPath}/connect/token`,
                    'application/x-www-form-urlencoded',
                    `grant_type=${this.grant_type}&username=${username}&password=${password}&client_id=${this.client_id}&client_secret=${this.client_secret}&scope=${this.scope}`
                ).then((data) => {
                    SSOConector.setToken(data);
                    if (this.autoRefreshToken) this._startAutoRefreshToken();
                    resolve(SSOConector.getToken());
                }, (error) => {
                    reject(error);
                });
        });

    }

    refreshToken() {

        return new Promise((resolve, reject) => {
            if (SSOConector.getToken()) {
                new HttpConnector(this.ssoTimeout)
                    .request(
                        'post',
                        `${this.apiPath}/connect/token`,
                        'application/x-www-form-urlencoded',
                        `grant_type=refresh_token&client_id=${this.client_id}&client_secret=${this.client_secret}&refresh_token=${SSOConector._token.refreshToken}`
                    ).then((data) => {
                        SSOConector.setToken(data);
                        resolve(SSOConector.getToken());
                    }, (error) => {
                        reject(error);
                    });
            } else {
                reject('Não há token há ser renovado!');
            }
        });

    }

    logOut() {
        if(this._ctrlRefreshInterval) clearTimeout(this._ctrlRefreshInterval);
        this._ctrlRefreshInterval = null;
        window.localStorage.removeItem("auth_data");
        SSOConector._token = null;
    }
}

class HttpConnector {

    constructor(timeout = 60000) {
        this.timeout = timeout;
        this.timeoutCtrl = null;
    }

    request(_method, _url, _contentType, _data) {

        return new Promise((resolve, reject) => {

            var xmlHttp = this._getXMLHttpRequest();
            xmlHttp.open(_method, _url, true);
            xmlHttp.setRequestHeader('Content-Type', _contentType);
            this.timeoutCtrl = null;

            xmlHttp.onreadystatechange = () => {
                if (xmlHttp.readyState === XMLHttpRequest.DONE) {
                    clearTimeout(this.timeoutCtrl);
                    var status = xmlHttp.status + '';
                    if (status.charAt(0) == '2') {
                        resolve(JSON.parse(xmlHttp.responseText));
                    } else {
                        reject(JSON.parse(xmlHttp.responseText));
                    }
                }
            }

            this.timeoutCtrl = setTimeout(() => {
                reject({ error: "timeout" });
            }, this.timeout);

            var _sendData = (_contentType != 'application/x-www-form-urlencoded') ? JSON.stringify(_data) : _data;
            xmlHttp.send(_sendData);
        });


    }

    _getXMLHttpRequest() {
        if (window.XMLHttpRequest) {
            return new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            return new ActiveXObject("Microsoft.XMLHTTP");
        }
    }
}