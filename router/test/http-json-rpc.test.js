'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');

const rpc = require('../src/http-json-rpc.js');

let server;
let bridgeUrl;
let lastRequest;

before(async () => {
    server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            lastRequest = { headers: req.headers, body };
            if (body.method === 'slow') {
                setTimeout(() => {
                    if (!res.writableEnded) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: {} }));
                    }
                }, 100);
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { ok: true } }));
        });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    bridgeUrl = `http://127.0.0.1:${server.address().port}/bridge`;
});

after(async () => {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
});

test('Editor Bridge 只接受带显式端口的 loopback /bridge URL', () => {
    assert.equal(rpc.isLoopbackBridgeUrl('http://127.0.0.1:7523/bridge'), true);
    assert.equal(rpc.isLoopbackBridgeUrl('http://localhost:7523/bridge'), true);
    assert.equal(rpc.isLoopbackBridgeUrl('http://127.0.0.1:7523/mcp'), false);
    assert.equal(rpc.isLoopbackBridgeUrl('https://127.0.0.1:7523/bridge'), false);
    assert.equal(rpc.isLoopbackBridgeUrl('http://192.168.1.2:7523/bridge'), false);
});

test('gateway v2 editor-bridge registry 必须声明 bridge 版本、loopback 地址和 token', () => {
    const base = {
        url: bridgeUrl,
        transport: 'editor-bridge',
        pid: process.pid,
        projectPath: '/tmp/project',
        projectShortName: 'project',
        gatewayApiVersion: 2,
        bridgeApiVersion: 1,
        authToken: 'd'.repeat(64),
    };
    assert.equal(rpc.validateRegistryEntry(base), null);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { url: 'http://127.0.0.1:7523/mcp' })), /bridge/);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { transport: 'mcp' })), /transport/);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { bridgeApiVersion: 2 })), /bridgeApiVersion/);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { gatewayApiVersion: 1 })), /gatewayApiVersion/);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { authToken: '' })), /authToken/);
    assert.match(rpc.validateRegistryEntry(Object.assign({}, base, { pid: 99999999 })), /not alive/);
});

test('Bridge 转发只携带私有 Bridge 版本和 Authorization，不伪装 MCP 下游', async () => {
    const result = await rpc.bridgeJsonRpc(bridgeUrl, {
        jsonrpc: '2.0', id: 11, method: 'bridge/invoke',
        params: { name: 'scene_query_node', arguments: {} },
    }, {
        authToken: 'e'.repeat(64),
        timeoutMs: 1000,
    });

    assert.deepEqual(result.result, { ok: true });
    assert.equal(lastRequest.headers['x-cocos-bridge-version'], '1');
    assert.equal(lastRequest.headers['mcp-protocol-version'], undefined);
    assert.equal(lastRequest.headers['mcp-method'], undefined);
    assert.equal(lastRequest.headers.authorization, `Bearer ${'e'.repeat(64)}`);
});

test('拒绝非 loopback Bridge 目标，并对下游超时给出明确错误', async () => {
    await assert.rejects(
        rpc.bridgeJsonRpc('http://example.com:80/bridge', { jsonrpc: '2.0', id: 2, method: 'bridge/ping' }),
        /invalid loopback/
    );
    await assert.rejects(
        rpc.bridgeJsonRpc(bridgeUrl, { jsonrpc: '2.0', id: 3, method: 'slow' }, { timeoutMs: 20 }),
        /timeout after 20ms/
    );
});

test('资源刷新和场景保存类操作使用长超时', () => {
    assert.equal(rpc.toolTimeoutMs('asset_refresh'), rpc.LONG_TOOL_TIMEOUT_MS);
    assert.equal(rpc.toolTimeoutMs('preview_refresh_and_reload'), rpc.LONG_TOOL_TIMEOUT_MS);
    assert.equal(rpc.toolTimeoutMs('scene_save_scene'), rpc.LONG_TOOL_TIMEOUT_MS);
    assert.equal(rpc.toolTimeoutMs('scene_query_node'), rpc.TOOL_TIMEOUT_MS);
});
