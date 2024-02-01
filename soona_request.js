export class SoonaRequest {
  constructor(operation, url, authToken, body, onload) {
    this.operation = operation;
    if (url.includes('http')) this.url = url;
    else if (window.location.href.includes('local')) this.url = `http://localhost:3000/${url}`;
    else this.url = `https://book.soona.co/${url}`;
    this.authToken = authToken;
    this.body = body;
    this.onload = onload;
    this.status = null;
    this.response = null;
  }

  async send() {
    let soonaRequest = this;
    return new Promise(function (resolve, reject) {
      let request = new XMLHttpRequest();
      request.open(soonaRequest.operation, soonaRequest.url);
      request = soonaRequest.setRequestHeaders(request);
      if (soonaRequest.authToken) request.withCredentials = true;
      request.onload = () => {
        if (request.status >= 200 && request.status < 400) {
          resolve(request);
        } else {
          reject(request);
        }
      }
      request.send(soonaRequest.body);
    }).then((request) => {
      this.status = request.status;
      this.response = request.response;
      this.onload(request);
    });
  }

  setRequestHeaders(request) {
    request.setRequestHeader("Accept", "application/json");
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Access-Control-Allow-Origin", "*")
    if (this.authToken) {
      request.setRequestHeader("X-SOONA-AUTH-PROVIDER", "soona_marketing")
      request.setRequestHeader("X-SOONA-PROVIDER-TOKEN", this.authToken)
    }
    return request;
  }

}