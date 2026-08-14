'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const localStatus = require('../local-status');

function makeInfo(overrides) {
    return Object.assign({
        projectPath: '/project/forest',
        projectName: 'forest',
        editorPid: 123,
        editorVersion: '3.8.8',
        previewUrl: 'http://127.0.0.1:7456',
        previewPort: 7456,
    }, overrides || {});
}

test('dev-reload info 仅 updatedAt 变化时不重复写入', () => {
    const previous = Object.assign(makeInfo(), { updatedAt: '2026-08-14T00:00:00.000Z' });
    assert.equal(localStatus.isSameDevReloadInfo(previous, makeInfo()), true);
});

test('预览端口或编辑器进程变化时需要更新 dev-reload info', () => {
    assert.equal(localStatus.isSameDevReloadInfo(makeInfo(), makeInfo({ previewPort: 7457 })), false);
    assert.equal(localStatus.isSameDevReloadInfo(makeInfo(), makeInfo({ editorPid: 456 })), false);
});

test('进程存活检测接受当前进程并拒绝非法 PID', () => {
    assert.equal(localStatus.isProcessAlive(process.pid), true);
    assert.equal(localStatus.isProcessAlive(0), false);
    assert.equal(localStatus.isProcessAlive('invalid'), false);
});
