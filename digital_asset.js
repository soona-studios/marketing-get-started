import { FileChecksum } from "./file_checksum.js";
import { SoonaRequest } from "./soona_request.js";

export class DigitalAsset {
  constructor(file) {
    this.file = file;
    this.checksum = null;
    this.directUploadSignedId = null;
    this.directUploadBlob = null;
    this.authToken = null;
    this.status = { value: null, message: null };
    this.digitalAsset = null;
  }

  async create(accountId, authToken, env='local') {
    try {
      this.authToken = authToken;
      this.accountId = accountId;
      this.environment = env;
  
      await this.createDirectUpload();
      await this.createAmazonS3Image();
      await this.createDigitalAsset();
      return this.digitalAsset;
    } catch (error) {
      console.log(error);
    }
  }

  async createDirectUpload() {
    return new Promise((resolve, reject) => {
      let onload = (request) => {
        if (request.status >= 200 && request.status < 400) {
          const response = JSON.parse(request.responseText);
          this.directUploadBlob = response;
          this.directUploadSignedId = response.signed_id;
          this.updateStatus('success', 'Direct upload created');
          resolve(); // Resolve the promise when direct upload is created
        } else {
          this.updateStatus('error', 'Error creating direct upload');
          reject('Error creating direct upload');
        }
      };

      FileChecksum.create(this.file, async (error, checksum) => {
        if (error) {
          reject(error);
          return;
        }

        let soonaRequest = new SoonaRequest(
          'POST',
          `${this.getUrlBase()}/api/direct_uploads/create`,
          this.authToken,
          JSON.stringify({
            blob: {
              filename: this.file.name,
              byte_size: this.file.size,
              checksum: checksum,
              content_type: this.file.type,
            },
          }),
          onload.bind(this)
        );
        await soonaRequest.send();
      });
    });
  }

  async createAmazonS3Image() {
    return new Promise((resolve, reject) => {
      const onload = (request) => {
        if (request.status >= 200 && request.status < 400) {
          this.updateStatus('success', 'Amazon S3 image created');
          resolve(); // Resolve the promise when Amazon S3 image is created
        } else {
          this.updateStatus('error', 'Error creating Amazon S3 image');
          reject('Error creating Amazon S3 image');
        }
      };
  
      const request = new XMLHttpRequest();
      request.open('PUT', this.directUploadBlob.direct_upload.url);
      
      for (const header in this.directUploadBlob.direct_upload.headers) {
        request.setRequestHeader(header, this.directUploadBlob.direct_upload.headers[header]);
      }
  
      // Use asynchronous request and handle onload in the callback
      request.onload = () => onload(request);
  
      request.send(this.file.slice());
    });
  }

  async createDigitalAsset() {
    return new Promise((resolve, reject) => {
      let onload = (request) => {
        if (request.status >= 200 && request.status < 400) {
          this.digitalAsset = JSON.parse(request.response);
          resolve(); // Resolve the promise when digital asset is created
        } else {
          this.updateStatus('error', 'Error creating digital asset');
          reject('Error creating digital asset');
        }
      };

      let soonaRequest = new SoonaRequest(
        'POST',
        `${this.getUrlBase()}/api/accounts/${this.accountId}/digital_assets`,
        this.authToken,
        JSON.stringify({
          digital_asset: {
            title: this.file.name,
            visibility: 2,
            origin: 1,
            origin_source: 1,
            ownership: 1,
            media_type: 0,
            asset_type: 2,
            file: this.directUploadSignedId,
          },
        }),
        onload.bind(this)
      );
      soonaRequest.send();
    });
  }

  getUrlBase() {
    if (this.urlBase) return this.urlBase;
    if (this.environment === 'production') this.urlBase = 'https://book.soona.co';
    else if (this.environment === 'develop') this.urlBase = 'https://develop.soona.co';
    else if (this.environment === 'release') this.urlBase ='https://release.soona.co';
    else this.urlBase = 'http://localhost:3000';
    return this.urlBase;
  }

  updateStatus(value, message) {
    this.status.value = value;
    this.status.message = message;
  }
}