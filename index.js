const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
const { SignatureV4 } = require('@smithy/signature-v4');
const { HttpRequest } = require('@smithy/protocol-http');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const url = require('url');
const http = require('http');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .help(false)
  .version(false)
  .argv;

const context = {};
const profile = process.env.AWS_PROFILE || argv.profile || 'default';

let creds = {};

async function execute(endpoint, region, path, headers, method, body) {
  if(argv.quiet !== true) {
    console.log('>>>', method, path);
  }

  const parsedUrl = new URL(`https://${endpoint}`);

  const request = new HttpRequest({
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    protocol: parsedUrl.protocol,
    path: path,
    method: method || 'GET',
    headers: {
      'host': parsedUrl.hostname,
      'presigned-expires': 'false'
    },
    body: body
  });

  const signer = new SignatureV4({
    credentials: creds,
    region: region,
    service: 'es',
    sha256: Sha256
  });

  const signedRequest = await signer.sign(request);

  // Add extra headers from the browser, excluding connection control and transport encoding
  const keys = Object.keys(headers);
  for (let i = 0, len = keys.length; i < len; i++) {
    if (keys[i] !== "host" &&
      keys[i] !== "accept-encoding" &&
      keys[i] !== "connection" &&
      keys[i] !== "origin") {
      signedRequest.headers[keys[i]] = headers[keys[i]];
    }
  }

  const client = new NodeHttpHandler();

  return new Promise((resolve, reject) => {
    client.handle(signedRequest)
      .then(({ response }) => {
        let body = '';
        response.body.on('data', (chunk) => {
          body += chunk;
        });
        response.body.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: body
          });
        });
      })
      .catch((err) => {
        console.log('Error: ' + err);
        reject(err);
      });
  });
}

async function requestHandler(request, response) {
  const body = [];

  request.on('data', chunk => {
    body.push(chunk);
  });

  request.on('end', async () => {
    const buf = Buffer.concat(body).toString();

    try {
      const resp = await execute(context.endpoint, context.region, request.url, request.headers, request.method, buf);

      // Pass through response headers, stripping connection control and content encoding
      const headers = {};
      const keys = Object.keys(resp.headers);
      for (let i = 0, klen = keys.length; i < klen; i++) {
        const k = keys[i];
        if (k !== undefined && k !== "connection" && k !== "content-encoding") {
          headers[k] = resp.headers[keys[i]];
        }
      }

      response.writeHead(resp.statusCode, headers);
      response.end(resp.body);
    } catch (err) {
      console.log('Unexpected error:', err.message);
      console.log(err.stack);

      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: err.message }));
    }
  });
}

const server = http.createServer(requestHandler);

async function startServer() {
  return new Promise((resolve) => {
    server.listen(context.port, function(){
      console.log('Listening on', context.port);
      resolve();
    });
  });
}

async function main() {
  try {
    const maybeUrl = argv._[0];
    context.region = argv.region || 'eu-west-1';
    context.port = argv.port || 9200;

    if(!maybeUrl || (maybeUrl && maybeUrl === 'help') || argv.help || argv.h) {
      console.log('Usage: aws-es-proxy [options] <url>');
      console.log();
      console.log('Options:');
      console.log("\t--profile \tAWS profile \t(Default: default)");
      console.log("\t--region \tAWS region \t(Default: eu-west-1)");
      console.log("\t--port  \tLocal port \t(Default: 9200)");
      console.log("\t--quiet  \tLog less");
      process.exit(1);
    }

    if(maybeUrl && maybeUrl.indexOf('http') === 0) {
      const uri = url.parse(maybeUrl);
      context.endpoint = uri.host;
    }

    const credentialProvider = fromNodeProviderChain({
      profile: profile
    });

    try {
      creds = await credentialProvider();
    } catch (err) {
      console.log('Error while getting AWS Credentials.');
      console.log(err);
      process.exit(1);
    }

    await startServer();
    console.log('Service started!');
  } catch (err) {
    console.error('Error:', err.message);
    console.log(err.stack);
    process.exit(1);
  }
}

if(!module.parent) {
  main();
}

module.exports = main;
