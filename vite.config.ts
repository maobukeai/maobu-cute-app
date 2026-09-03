import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite plugin to handle Microsoft OAuth2 & Graph API proxying with zero CORS issues
function microsoftProxyPlugin() {
  return {
    name: 'microsoft-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // 1. Proxy Microsoft OAuth Token Endpoint
        if (req.url === '/api/ms-oauth/token' && req.method === 'POST') {
          try {
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const body = Buffer.concat(chunks).toString();
              const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
              });

              const data = await response.text();
              res.writeHead(response.status, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(data);
            });
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy token refresh failed', details: err.message }));
            return;
          }
        }

        // 2. Proxy Microsoft Outlook REST API (v2.0)
        if (req.url && req.url.startsWith('/api/ms-outlook/')) {
          try {
            const targetPath = req.url.replace('/api/ms-outlook/', '');
            const targetUrl = `https://outlook.office.com/api/v2.0/${targetPath}`;
            
            const authHeader = req.headers['authorization'];
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
              const fetchOptions: RequestInit = {
                method: req.method,
                headers: {
                  'Authorization': authHeader || '',
                  'Content-Type': req.headers['content-type'] || 'application/json',
                },
              };
              if (body && req.method !== 'GET' && req.method !== 'HEAD') {
                fetchOptions.body = body;
              }

              const response = await fetch(targetUrl, fetchOptions);
              const data = await response.text();
              res.writeHead(response.status, {
                'Content-Type': response.headers.get('content-type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(data);
            });
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy outlook call failed', details: err.message }));
            return;
          }
        }

        // 3. Proxy Microsoft Graph API
        if (req.url && req.url.startsWith('/api/ms-graph/')) {
          try {
            const targetPath = req.url.replace('/api/ms-graph/', '');
            const targetUrl = `https://graph.microsoft.com/v1.0/${targetPath}`;
            
            const authHeader = req.headers['authorization'];
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
              const fetchOptions: RequestInit = {
                method: req.method,
                headers: {
                  'Authorization': authHeader || '',
                  'Content-Type': req.headers['content-type'] || 'application/json',
                },
              };
              if (body && req.method !== 'GET' && req.method !== 'HEAD') {
                fetchOptions.body = body;
              }

              const response = await fetch(targetUrl, fetchOptions);
              const data = await response.text();
              res.writeHead(response.status, {
                'Content-Type': response.headers.get('content-type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(data);
            });
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy graph call failed', details: err.message }));
            return;
          }
        }

        // 3. Generic AI Ping / Proxy
        if (req.url && req.url.startsWith('/api/ai-proxy')) {
          try {
            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const bodyStr = Buffer.concat(chunks).toString();
              const payload = JSON.parse(bodyStr);
              const { url, headers, method = 'POST', body } = payload;

              const fetchOpts: RequestInit = {
                method,
                headers,
              };
              if (body && method !== 'GET' && method !== 'HEAD') {
                fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
              }

              const response = await fetch(url, fetchOpts);

              res.writeHead(response.status, {
                'Content-Type': response.headers.get('content-type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
              });

              if (response.body) {
                const reader = response.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
                res.end();
              } else {
                const data = await response.text();
                res.end(data);
              }
            });
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'AI proxy failed', details: err.message }));
            return;
          }
        }

        // 4. WebDAV Cloud Backup Proxy (PROPFIND, MKCOL, PUT, GET, DELETE)
        if (req.url && req.url.startsWith('/api/webdav-proxy')) {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS',
              'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, X-Target-Url',
            });
            res.end();
            return;
          }

          try {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const targetUrl = req.headers['x-target-url'] || parsedUrl.searchParams.get('target');
            if (!targetUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing target URL' }));
              return;
            }

            const chunks: any[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
              const headers: Record<string, string> = {};
              if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
              if (req.headers['depth']) headers['Depth'] = req.headers['depth'];
              if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

              const fetchOptions: any = {
                method: req.method,
                headers,
              };
              if (body && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                fetchOptions.body = body;
              }

              const response = await fetch(targetUrl as string, fetchOptions);
              const data = await response.text();
              res.writeHead(response.status, {
                'Content-Type': response.headers.get('content-type') || 'text/plain',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(data);
            });
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'WebDAV proxy failed', details: err.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), microsoftProxyPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
