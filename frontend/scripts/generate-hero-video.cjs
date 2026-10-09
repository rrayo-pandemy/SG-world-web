#!/usr/bin/env node

/*
 * Generates the quiet Ganesh construction Hero loop from a local JPEG.
 * Usage: node scripts/generate-hero-video.cjs [path-to-source.jpg]
 * Requires Microsoft Edge or Google Chrome; no npm package is added.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');

const frontend = path.resolve(__dirname, '..');
const assets = path.join(frontend, 'assets');
const images = path.join(assets, 'images');
const videos = path.join(assets, 'videos');
const defaultSource = path.join(images, 'hero-background-source.jpg');
const outputPoster = path.join(images, 'hero-background.jpg');
const outputVideo = path.join(videos, 'hero-background.webm');
const sourceImage = path.resolve(process.argv[2] || defaultSource);
const edgeCandidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);

const capturePage = String.raw`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Ganesh Hero video render</title>
<style>html,body{margin:0;background:#10261f}canvas{width:1280px;height:720px}</style>
<canvas id="frame" width="1280" height="720"></canvas>
<script>
(function () {
    'use strict';
    var canvas = document.getElementById('frame');
    var ctx = canvas.getContext('2d', { alpha: false });
    var image = new Image();
    var width = canvas.width;
    var height = canvas.height;
    var duration = 8200;
    var startedAt = 0;
    var recorder;
    var chunks = [];

    function stroke(points, color, lineWidth, alpha, phase, dash) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (dash) {
            ctx.setLineDash([8, 14]);
            ctx.lineDashOffset = -phase * 22;
        }
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (var i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
        ctx.stroke();
        ctx.restore();
    }

    function pulse(points, color, progress) {
        var lengths = [];
        var total = 0;
        for (var i = 1; i < points.length; i += 1) {
            var dx = points[i][0] - points[i - 1][0];
            var dy = points[i][1] - points[i - 1][1];
            var length = Math.sqrt(dx * dx + dy * dy);
            lengths.push(length);
            total += length;
        }
        var distance = progress * total;
        var point = points[points.length - 1];
        for (var j = 0; j < lengths.length; j += 1) {
            if (distance <= lengths[j]) {
                var ratio = distance / lengths[j];
                point = [
                    points[j][0] + (points[j + 1][0] - points[j][0]) * ratio,
                    points[j][1] + (points[j + 1][1] - points[j][1]) * ratio
                ];
                break;
            }
            distance -= lengths[j];
        }
        ctx.save();
        ctx.globalAlpha = 0.84;
        ctx.shadowColor = color;
        ctx.shadowBlur = 13;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point[0], point[1], 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBlueprint(phase) {
        var top = [[810, 202], [985, 154], [1110, 199], [934, 250], [810, 202]];
        var front = [[810, 202], [810, 548], [934, 595], [934, 250]];
        var side = [[934, 250], [1110, 199], [1110, 544], [934, 595]];
        var water = [[912, 229], [912, 330], [876, 344], [876, 492], [920, 508], [920, 578]];
        var power = [[974, 217], [974, 322], [1030, 338], [1030, 469], [987, 483], [987, 561]];
        var data = [[842, 214], [842, 360], [903, 383], [903, 542]];

        ctx.save();
        ctx.globalAlpha = 0.27;
        ctx.strokeStyle = '#e9f2e9';
        ctx.lineWidth = 1.2;
        ctx.lineJoin = 'round';
        [top, front, side].forEach(function (points) {
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (var i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
            ctx.stroke();
        });
        [1, 2, 3].forEach(function (floor) {
            var y = 202 + floor * 86.5;
            ctx.beginPath();
            ctx.moveTo(810, y);
            ctx.lineTo(934, y + 47);
            ctx.lineTo(1110, y - 51);
            ctx.stroke();
        });
        [0.25, 0.5, 0.75].forEach(function (column) {
            var x = 810 + column * 124;
            ctx.beginPath();
            ctx.moveTo(x, 202 + column * 48);
            ctx.lineTo(x, 548 + column * 47);
            ctx.stroke();
        });
        ctx.restore();

        stroke(water, '#54d7c1', 2.4, 0.6, phase, true);
        stroke(power, '#d4f542', 2.4, 0.58, phase + 0.24, true);
        stroke(data, '#83b4ff', 1.8, 0.53, phase + 0.48, true);
        pulse(water, '#54d7c1', (phase + 0.08) % 1);
        pulse(power, '#d4f542', (phase + 0.39) % 1);
        pulse(data, '#83b4ff', (phase + 0.69) % 1);
    }

    function draw(timestamp) {
        if (!startedAt) startedAt = timestamp;
        var elapsed = (timestamp - startedAt) % duration;
        var angle = elapsed / duration * Math.PI * 2;
        var phase = elapsed / duration;
        var zoom = 1.045 + (1 - Math.cos(angle)) * 0.007;
        var panX = Math.sin(angle) * 5;
        var panY = (1 - Math.cos(angle)) * 2;
        var scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
        var drawWidth = image.naturalWidth * scale;
        var drawHeight = image.naturalHeight * scale;
        var x = (width - drawWidth) / 2 + panX;
        var y = (height - drawHeight) / 2 + panY;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        drawBlueprint(phase);
        if (recorder && recorder.state === 'recording' && timestamp - recordingStart >= duration) {
            recorder.stop();
            return;
        }
        requestAnimationFrame(draw);
    }

    var recordingStart = 0;
    image.onload = function () {
        if (!window.MediaRecorder || !canvas.captureStream) {
            document.body.dataset.error = 'MediaRecorder is unavailable';
            return;
        }
        var stream = canvas.captureStream(24);
        var mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
            .find(function (candidate) { return MediaRecorder.isTypeSupported(candidate); });
        if (!mime) {
            document.body.dataset.error = 'No supported WebM codec';
            return;
        }
        recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1250000 });
        recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onerror = function (event) {
            document.body.dataset.error = event.error ? event.error.message : 'Recording failed';
        };
        recorder.onstop = async function () {
            stream.getTracks().forEach(function (track) { track.stop(); });
            try {
                var videoBlob = new Blob(chunks, { type: 'video/webm' });
                var scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.045;
                var posterWidth = image.naturalWidth * scale;
                var posterHeight = image.naturalHeight * scale;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(image, (width - posterWidth) / 2, (height - posterHeight) / 2, posterWidth, posterHeight);
                var posterBlob = await new Promise(function (resolve, reject) {
                    canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('Poster encode failed')); }, 'image/jpeg', 0.78);
                });
                var responses = await Promise.all([
                    fetch('/video', { method: 'POST', headers: { 'Content-Type': 'video/webm' }, body: videoBlob }),
                    fetch('/poster', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: posterBlob })
                ]);
                if (responses.some(function (response) { return !response.ok; })) throw new Error('Could not save the generated assets');
                document.body.dataset.done = 'true';
            } catch (error) {
                document.body.dataset.error = error.message;
            }
        };
        requestAnimationFrame(draw);
        recordingStart = performance.now();
        recorder.start(500);
        setTimeout(function () {
            if (recorder.state === 'recording') recorder.stop();
        }, duration + 80);
    };
    image.onerror = function () { document.body.dataset.error = 'Could not load the source image'; };
    image.src = '/source';
})();
</script>
</html>`;

function getBrowserPath() {
    return edgeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address();
            probe.close((error) => error ? reject(error) : resolve(port));
        });
    });
}

async function waitForBrowser(port, child) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error('Browser exited before starting.');
        try {
            const response = await fetch('http://127.0.0.1:' + port + '/json/version');
            if (response.ok) return;
        } catch (_) {}
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error('Timed out waiting for the browser debugging endpoint.');
}

async function openCapturePage(port, pageUrl) {
    const response = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' });
    if (!response.ok) throw new Error('Could not open the browser capture page.');
    const target = await response.json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    let commandId = 0;
    const pending = new Map();
    socket.addEventListener('message', (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }
        if (message.id && pending.has(message.id)) {
            const { resolve, reject } = pending.get(message.id);
            pending.delete(message.id);
            message.error ? reject(new Error(message.error.message)) : resolve(message.result);
        }
    });
    const command = (method, params) => new Promise((resolve, reject) => {
        const id = ++commandId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params: params || {} }));
    });
    await command('Page.enable');
    await command('Runtime.enable');
    await command('Page.navigate', { url: pageUrl });
    return socket;
}

async function main() {
    const browserPath = getBrowserPath();
    if (!browserPath) throw new Error('Microsoft Edge or Google Chrome was not found. Set EDGE_PATH or CHROME_PATH.');
    if (!fs.existsSync(sourceImage)) {
        throw new Error('Source JPEG not found: ' + sourceImage + '\nPass a JPG path or add assets/images/hero-background-source.jpg.');
    }

    fs.mkdirSync(images, { recursive: true });
    fs.mkdirSync(videos, { recursive: true });
    const debuggingPort = await getFreePort();
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ganesh-hero-edge-'));
    let posterSaved = false;
    let videoSaved = false;
    let browser;
    let socket;
    let captureServer;

    const saved = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out while rendering the Hero loop.')), 45000);
        const server = captureServer = http.createServer(async (request, response) => {
            if (request.method === 'GET' && request.url === '/capture') {
                response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
                response.end(capturePage);
                return;
            }
            if (request.method === 'GET' && request.url === '/source') {
                response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
                fs.createReadStream(sourceImage).pipe(response);
                return;
            }
            if (request.method === 'POST' && (request.url === '/poster' || request.url === '/video')) {
                const isPoster = request.url === '/poster';
                const destination = isPoster ? outputPoster : outputVideo;
                try {
                    await pipeline(request, fs.createWriteStream(destination + '.tmp'));
                    fs.renameSync(destination + '.tmp', destination);
                    response.writeHead(201);
                    response.end('saved');
                    if (isPoster) posterSaved = true;
                    else videoSaved = true;
                    if (posterSaved && videoSaved) {
                        clearTimeout(timeout);
                        server.close();
                        resolve();
                    }
                } catch (error) {
                    response.writeHead(500);
                    response.end('write failed');
                    clearTimeout(timeout);
                    server.close();
                    reject(error);
                }
                return;
            }
            response.writeHead(404);
            response.end('not found');
        });
        server.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        server.listen(0, '127.0.0.1', async () => {
            const serverPort = server.address().port;
            const pageUrl = 'http://127.0.0.1:' + serverPort + '/capture';
            browser = spawn(browserPath, [
                '--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
                '--disable-extensions', '--disable-background-networking', '--autoplay-policy=no-user-gesture-required',
                '--remote-debugging-port=' + debuggingPort, '--remote-allow-origins=*',
                '--user-data-dir=' + profile, 'about:blank'
            ], { windowsHide: true, stdio: 'ignore' });
            browser.once('error', (error) => {
                clearTimeout(timeout);
                server.close();
                reject(error);
            });
            try {
                await waitForBrowser(debuggingPort, browser);
                socket = await openCapturePage(debuggingPort, pageUrl);
                socket.addEventListener('message', (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.method === 'Runtime.exceptionThrown') {
                            const details = message.params.exceptionDetails;
                            console.error('Browser capture error:', details.text);
                        }
                    } catch (_) {}
                });
            } catch (error) {
                clearTimeout(timeout);
                server.close();
                reject(error);
            }
        });
    });

    try {
        await saved;
        console.log('Generated ' + path.relative(frontend, outputPoster));
        console.log('Generated ' + path.relative(frontend, outputVideo));
    } finally {
        if (socket && socket.readyState === WebSocket.OPEN) socket.close();
        if (captureServer && captureServer.listening) captureServer.close();
        if (browser && browser.exitCode === null && browser.signalCode === null) {
            const exited = new Promise((resolve) => browser.once('exit', resolve));
            browser.kill();
            await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2500))]);
        }
        if (fs.existsSync(profile)) fs.rmSync(profile, { recursive: true, force: true });
        for (const file of [outputPoster + '.tmp', outputVideo + '.tmp']) {
            if (fs.existsSync(file)) fs.rmSync(file, { force: true });
        }
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
