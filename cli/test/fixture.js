'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  makePrefabRoot,
  makeNode,
  makePrefabInfo,
  makeCompPrefabInfo,
  makeUITransform,
  makeSprite,
  makeLabel,
} = require('../src/primitives.js');

const FIXTURE_DIR = path.join(__dirname, 'fixtures');
const FIXTURE_PROJECT_ROOT = path.join(FIXTURE_DIR, 'project');
const FIXTURE_ASSETS_DIR = path.join(FIXTURE_PROJECT_ROOT, 'assets');
const FIXTURE_TEMP_DIR = path.join(FIXTURE_ASSETS_DIR, '.tmp');
const HOME_UI_FIXTURE = path.join(FIXTURE_ASSETS_DIR, 'HomeUI.prefab');
const NESTED_PREFAB_FIXTURE = path.join(FIXTURE_ASSETS_DIR, 'TaskEntry.prefab');
const TASK_BTN_UUID = '5f4d2de3-a7dc-4d47-a41f-f27a12549b20';
const NESTED_PREFAB_UUID = 'addbe9a2-fd7e-5f3b-9164-ee44de8b1045';
const NESTED_ROOT_FILE_ID = 'as0LdMaKxSWSLxrZB9u9KA';

/**
 * 生成一个只覆盖 CLI/override 测试契约的最小 Cocos 3 Prefab。
 * stub 固定放在 id=10，保留旧测试对 mountedChildren/propertyOverrides 的覆盖。
 */
function buildHomeUiFixture() {
  const elements = new Array(28);

  elements[0] = makePrefabRoot({ name: 'HomeUI', rootId: 1 });
  elements[1] = makeNode({
    name: 'HomeUI',
    childIds: [2, 4, 6, 8, 10, 24],
    prefabId: 19,
  });
  elements[2] = makeNode({
    name: 'touchArea',
    pos: [0, 0, 0],
    parentId: 1,
    prefabId: 3,
  });
  elements[3] = makePrefabInfo({ rootId: 1, fileId: 'fixtureTouchAreaFileId' });
  elements[4] = makeNode({
    name: 'left',
    pos: [-243, 12, 0],
    parentId: 1,
    prefabId: 5,
  });
  elements[5] = makePrefabInfo({ rootId: 1, fileId: 'fixtureLeftNodeFileId' });
  elements[6] = makeNode({
    name: 'n5',
    parentId: 1,
    componentIds: [7],
    prefabId: 20,
  });
  elements[7] = makeSprite({
    nodeId: 6,
    spriteFrameUuid: '00000000-0000-0000-0000-000000000005@f9941',
    prefabInfoId: 22,
  });
  elements[8] = makeNode({
    name: 'n7',
    parentId: 1,
    componentIds: [9],
    prefabId: 21,
  });
  elements[9] = makeLabel({
    nodeId: 8,
    string: '开始',
    prefabInfoId: 23,
  });

  // nested prefab stub：结构与 Creator 3.8 序列化格式一致。
  elements[10] = {
    __type__: 'cc.Node',
    _objFlags: 0,
    _parent: { __id__: 1 },
    _prefab: { __id__: 11 },
    __editorExtras__: {},
  };
  elements[11] = {
    __type__: 'cc.PrefabInfo',
    root: { __id__: 10 },
    asset: {
      __uuid__: NESTED_PREFAB_UUID,
      __expectedType__: 'cc.Prefab',
    },
    fileId: NESTED_ROOT_FILE_ID,
    instance: { __id__: 12 },
    targetOverrides: null,
  };
  elements[12] = {
    __type__: 'cc.PrefabInstance',
    fileId: 'fixtureNestedInstanceId',
    prefabRootNode: { __id__: 1 },
    mountedChildren: [],
    mountedComponents: [],
    propertyOverrides: [13, 15, 16, 17, 18].map((id) => ({ __id__: id })),
    removedComponents: [],
  };
  elements[13] = {
    __type__: 'CCPropertyOverrideInfo',
    targetInfo: { __id__: 14 },
    propertyPath: ['_name'],
    value: 'taskEntry',
  };
  elements[14] = {
    __type__: 'cc.TargetInfo',
    localID: [NESTED_ROOT_FILE_ID],
  };
  elements[15] = {
    __type__: 'CCPropertyOverrideInfo',
    targetInfo: { __id__: 14 },
    propertyPath: ['_lpos'],
    value: { __type__: 'cc.Vec3', x: -272, y: 53, z: 0 },
  };
  elements[16] = {
    __type__: 'CCPropertyOverrideInfo',
    targetInfo: { __id__: 14 },
    propertyPath: ['_lrot'],
    value: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
  };
  elements[17] = {
    __type__: 'CCPropertyOverrideInfo',
    targetInfo: { __id__: 14 },
    propertyPath: ['_euler'],
    value: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
  };
  elements[18] = {
    __type__: 'CCPropertyOverrideInfo',
    targetInfo: { __id__: 14 },
    propertyPath: ['_lscale'],
    value: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
  };

  elements[19] = makePrefabInfo({
    rootId: 1,
    fileId: 'fixtureHomeRootFileId',
    nestedPrefabInstanceRoots: [10],
  });
  elements[20] = makePrefabInfo({ rootId: 1, fileId: 'fixtureSpriteNodeFileId' });
  elements[21] = makePrefabInfo({ rootId: 1, fileId: 'fixtureLabelNodeFileId' });
  elements[22] = makeCompPrefabInfo('fixtureSpriteCompId');
  elements[23] = makeCompPrefabInfo('fixtureLabelCompId');
  elements[24] = makeNode({
    name: 'btnMerge',
    parentId: 1,
    componentIds: [26],
    prefabId: 25,
  });
  elements[25] = makePrefabInfo({ rootId: 1, fileId: 'fixtureBtnMergeNodeFileId' });
  elements[26] = makeUITransform({
    nodeId: 24,
    width: 120,
    height: 60,
    prefabInfoId: 27,
  });
  elements[27] = makeCompPrefabInfo('fixtureBtnMergeUiTransformId');

  return elements;
}

function buildNestedPrefabFixture() {
  return [
    makePrefabRoot({ name: 'TaskEntry', rootId: 1 }),
    makeNode({ name: 'TaskEntry', prefabId: 2 }),
    makePrefabInfo({ rootId: 1, fileId: NESTED_ROOT_FILE_ID }),
  ];
}

function writeGeneratedFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) return;

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(tempPath);
    else throw error;
  }
}

function ensureHomeUiFixture() {
  fs.mkdirSync(FIXTURE_TEMP_DIR, { recursive: true });
  writeGeneratedFile(
    path.join(FIXTURE_PROJECT_ROOT, 'package.json'),
    JSON.stringify({ name: 'cc-mcp-test-project', private: true }, null, 2) + '\n'
  );
  writeGeneratedFile(
    NESTED_PREFAB_FIXTURE,
    JSON.stringify(buildNestedPrefabFixture(), null, 2) + '\n'
  );
  writeGeneratedFile(
    `${NESTED_PREFAB_FIXTURE}.meta`,
    JSON.stringify({ ver: '1.1.50', importer: 'prefab', imported: true, uuid: NESTED_PREFAB_UUID }, null, 2) + '\n'
  );
  const taskBtnPath = path.join(FIXTURE_ASSETS_DIR, 'scripts', 'TaskBtn.ts');
  writeGeneratedFile(
    taskBtnPath,
    "import { _decorator, Component } from 'cc';\nconst { ccclass } = _decorator;\n@ccclass('TaskBtn')\nexport class TaskBtn extends Component {}\n"
  );
  writeGeneratedFile(
    `${taskBtnPath}.meta`,
    JSON.stringify({ ver: '4.0.24', importer: 'typescript', imported: true, uuid: TASK_BTN_UUID }, null, 2) + '\n'
  );
  writeGeneratedFile(
    HOME_UI_FIXTURE,
    JSON.stringify(buildHomeUiFixture(), null, 2) + '\n'
  );
  return HOME_UI_FIXTURE;
}

module.exports = {
  HOME_UI_FIXTURE,
  FIXTURE_PROJECT_ROOT,
  FIXTURE_TEMP_DIR,
  TASK_BTN_UUID,
  buildHomeUiFixture,
  buildNestedPrefabFixture,
  ensureHomeUiFixture,
};
