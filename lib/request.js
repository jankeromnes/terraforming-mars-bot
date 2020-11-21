// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.

const http = require('http');
const https = require('https');

module.exports = async (method, url, data) => {
  const protocols = { http, https };
  const client = url.includes('://') ? protocols[url.split('://')[0]] : http;
  if (!client) {
    throw new Error(`Unsupported protocol: ${url}`);
  }
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method }, res => {
      if (res.statusCode >= 400) {
        reject(new Error(`Couldn't ${method} ${url} - Response status: ${res.statusCode}`));
        return;
      }
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('error', error => { reject(error); });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_) {
          resolve(body);
        }
      });
    }).on('error', error => {
      reject(error);
    });
    req.on('error', error => { reject(error); });
    if (data) {
      req.write(JSON.stringify(data, null, 2));
    }
    req.end();
  });
};
