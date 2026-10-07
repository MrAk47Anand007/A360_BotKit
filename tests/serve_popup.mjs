import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
http.createServer(async (req, res) => {
    try {
        const path = req.url.split('?')[0] === '/popup-harness' ? '/popup/popup.html' : req.url.split('?')[0];
        const file = resolve(root, `.${path}`);
        if (!file.startsWith(`${root}\\`) && !file.startsWith(`${root}/`)) throw new Error('Invalid path');
        let content = await readFile(file);
        if (req.url === '/popup-harness') {
            content = content.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
                .replace('href="popup.css"', 'href="/popup/popup.css"')
                .replace('</body>', '<script type="module" src="/tests/popup_harness.js"></script></body>');
        }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' }[extname(file)] || 'application/octet-stream');
        res.end(content);
    } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8766, '127.0.0.1', () => console.log('Popup fixture: http://127.0.0.1:8766/popup-harness'));
