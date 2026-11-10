// 테스트용 정적 서버 (127.0.0.1:8766): www/ 의 빈 페이지 · 그림 + /sn/ 아래 jQuery · jQuery UI · Bootstrap · Summernote (npm 패키지에서)
const http = require('http'), fs = require('fs'), path = require('path');
const nm = p => path.join(__dirname, 'node_modules', p);
const SN = {
  'jquery.min.js': nm('jquery/dist/jquery.min.js'),
  'jquery-ui.min.js': nm('jquery-ui-dist/jquery-ui.min.js'),
  'jquery-ui.min.css': nm('jquery-ui-dist/jquery-ui.min.css'),
  'bootstrap.min.js': nm('bootstrap/dist/js/bootstrap.min.js'),
  'bootstrap.min.css': nm('bootstrap/dist/css/bootstrap.min.css'),
  'summernote.min.js': nm('summernote/dist/summernote.min.js'),
  'summernote.css': nm('summernote/dist/summernote.css'),
};
const TYPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const file = u.startsWith('/sn/font/') ? nm('summernote/dist/font/' + path.basename(u))
    : u.startsWith('/sn/') ? SN[path.basename(u)] : path.join(__dirname, 'www', path.normalize(u).replace(/^([/\\])+/, ''));
  fs.readFile(file || '', (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPE[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(8766, '127.0.0.1', () => console.log('serving on http://127.0.0.1:8766'));
