export class HttpConnector {

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