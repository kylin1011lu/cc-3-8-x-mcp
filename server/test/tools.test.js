'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { defineTools } = require('../tools.js');

function createTools(calls) {
    return defineTools({
        msg: async function () {
            const args = Array.from(arguments);
            calls.push(args);
            return { ok: true };
        },
        local: {},
    });
}

test('scene_execute_script 直接转发 execute-scene-script，不经过组件方法', async () => {
    const calls = [];
    const tools = createTools(calls);
    const tool = tools.find((item) => item.name === 'scene_execute_script');

    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['extension', 'method']);
    await tool.handler({
        extension: 'spine-vat-pipeline',
        method: 'getBakeBatchStatus',
        args: [{ verbose: true }],
    });

    assert.deepEqual(calls, [[
        'scene',
        'execute-scene-script',
        {
            name: 'spine-vat-pipeline',
            method: 'getBakeBatchStatus',
            args: [{ verbose: true }],
        },
    ]]);
});

test('scene_execute_script 缺省 args 使用空数组，原组件工具路由保持不变', async () => {
    const calls = [];
    const tools = createTools(calls);
    const scriptTool = tools.find((item) => item.name === 'scene_execute_script');
    const componentTool = tools.find((item) => item.name === 'scene_execute_component_method');

    await scriptTool.handler({ extension: 'demo-extension', method: 'inspect' });
    await componentTool.handler({ uuid: 'node-uuid', name: 'refresh', args: [1] });

    assert.deepEqual(calls, [
        ['scene', 'execute-scene-script', {
            name: 'demo-extension',
            method: 'inspect',
            args: [],
        }],
        ['scene', 'execute-component-method', {
            uuid: 'node-uuid',
            name: 'refresh',
            args: [1],
        }],
    ]);
});
