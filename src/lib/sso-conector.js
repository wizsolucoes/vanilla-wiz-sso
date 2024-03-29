import { HttpConnector } from './http-connector';

export class SSOConector {

    static setToken(_token) {
        SSOConector._token = {
            tokenType: _token.token_type,
            hash: _token.access_token,
            expiresIn: (_token.expires_in * 1000) + SSOConector._getCurrentTime(),
            refreshToken: _token.refresh_token
        }

        window.localStorage.setItem("w-auth", JSON.stringify(SSOConector._token));
    }

    static getToken() {
        return SSOConector._token;
    }

    constructor(config) {
        if (!config.options) config.options = {};
        if (!config.options.tokenAutoRefresh) config.options.tokenAutoRefresh = true;
        if (!config.options.ssoTimeout) config.ssoTimeout = 60000;
        if (!config.apiSubscription) config.apiSubscription = '';

        this.apiPath = config.apiPath;
        this.client_id = encodeURIComponent(config.clientID);
        this.grant_type = encodeURIComponent(config.grantType);
        this.client_secret = encodeURIComponent(config.clientSecret);
        this.scope = encodeURIComponent(config.scope);

        this.autoRefreshToken = config.options.tokenAutoRefresh;
        this.ssoTimeout = config.options.ssoTimeOut;
        this.apiSubscription = config.apiSubscription;

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

            var data = window.localStorage.getItem("w-auth");

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
                                _ => {
                                    SSOConector.onAutoRefreshFail && SSOConector.onAutoRefreshFail();
                                    reject('Não foi possível renovar o token antigo!') 
                                }
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
            new HttpConnector(this.ssoTimeout, this.apiSubscription)
                .request(
                    'post',
                    `${this.apiPath}/connect/token`,
                    'application/x-www-form-urlencoded',
                    `grant_type=${this.grant_type}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&client_id=${this.client_id}&client_secret=${this.client_secret}&scope=${this.scope}`
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
                new HttpConnector(this.ssoTimeout, this.apiSubscription)
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
        window.localStorage.removeItem("w-auth");
        SSOConector._token = null;
    }
}