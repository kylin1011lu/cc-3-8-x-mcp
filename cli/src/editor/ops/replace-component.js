// replace-component: 在普通节点上原位替换一个组件。
//
// op: {
//   op: 'replace-component',
//   node,
//   componentType,             // 当前组件类型
//   replacementType?,          // 新组件类型；缺省表示同类型重建
//   preserveProperties?,       // true（默认）/ false / string[]
//   props?,                    // 覆盖或补充的新属性
//   refreshFileId?,            // true 时模拟“删旧再挂新”，生成新的 CompPrefabInfo.fileId
// }
//
// 组件对象始终写回原 __id__ 槽位，因此节点 _components 顺序、同 prefab 内所有
// 指向该组件的 __id__ 引用、root targetOverrides 的 source/target 都保持有效。
// 默认复用原 CompPrefabInfo/fileId，避免外层 nested prefab 的 localID override 失效。
// refreshFileId=true 只用于明确需要刷新组件身份的场景；此时外层 prefab 若按旧
// localID 覆盖该组件，需要由调用方一并重核。

'use strict';

const { ref, makeCompPrefabInfo } = require('../../primitives.js');
const {
  normalizeComponentType,
  isStub,
  resolveNode,
} = require('../helpers.js');
const {
  collectExistingFileIds,
  uniqueFileId,
  isReservedCompField,
} = require('../id-utils.js');

function cloneSerialized(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function validatePreserveProperties(value) {
  if (value === undefined || typeof value === 'boolean') return;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0)) {
    return;
  }
  throw new Error(
    'editPrefab [replace-component]: preserveProperties 必须是 boolean 或字符串数组'
  );
}

function validateProps(props) {
  if (props === undefined) return;
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    throw new Error('editPrefab [replace-component]: props 必须是对象');
  }
  for (const key of Object.keys(props)) {
    if (isReservedCompField(key)) {
      throw new Error(
        `editPrefab [replace-component]: props 不允许覆盖保留字段 "${key}"`
      );
    }
  }
}

function findSingleComponent(elements, node, componentType, rawComponentType) {
  const matches = [];
  if (Array.isArray(node._components)) {
    for (const compRef of node._components) {
      if (!compRef || typeof compRef.__id__ !== 'number') continue;
      const comp = elements[compRef.__id__];
      if (comp && comp.__type__ === componentType) {
        matches.push({ compId: compRef.__id__, comp });
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `editPrefab [replace-component]: 节点 "${node._name}" 上找不到 ${rawComponentType} 组件`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `editPrefab [replace-component]: 节点 "${node._name}" 上有 ${matches.length} 个 ${rawComponentType} 组件，无法确定替换目标；请先用 dedupe-component 去重`
    );
  }
  return matches[0];
}

function resolveCompPrefabRef(prefabData, oldComp, node, replacementType, refreshFileId) {
  const { elements } = prefabData;
  const oldRef = oldComp && oldComp.__prefab;
  if (!refreshFileId && oldRef && typeof oldRef.__id__ === 'number') {
    const oldInfo = elements[oldRef.__id__];
    if (oldInfo && oldInfo.__type__ === 'cc.CompPrefabInfo') {
      return cloneSerialized(oldRef);
    }
  }

  let seed = 'unknown';
  if (node._prefab && typeof node._prefab.__id__ === 'number') {
    const nodeInfo = elements[node._prefab.__id__];
    if (nodeInfo && nodeInfo.fileId) seed = nodeInfo.fileId;
  }
  const existingFileIds = collectExistingFileIds(elements);
  const fileId = uniqueFileId(`${seed}#replaceComp#${replacementType}`, existingFileIds);
  const compPrefabInfoId = elements.length;
  elements.push(makeCompPrefabInfo(fileId));
  return ref(compPrefabInfoId);
}

function execReplaceComponent(prefabData, op) {
  const { elements } = prefabData;
  const {
    node: nodeSelector,
    componentType: rawComponentType,
    replacementType: rawReplacementType,
    preserveProperties,
    props,
    refreshFileId,
  } = op;

  if (typeof rawComponentType !== 'string' || rawComponentType.length === 0) {
    throw new Error('editPrefab [replace-component]: componentType 必须是非空字符串');
  }
  if (rawReplacementType !== undefined &&
      (typeof rawReplacementType !== 'string' || rawReplacementType.length === 0)) {
    throw new Error('editPrefab [replace-component]: replacementType 必须是非空字符串');
  }
  if (refreshFileId !== undefined && typeof refreshFileId !== 'boolean') {
    throw new Error('editPrefab [replace-component]: refreshFileId 必须是 boolean');
  }
  validatePreserveProperties(preserveProperties);
  validateProps(props);

  const componentType = normalizeComponentType(
    rawComponentType,
    prefabData.resolverStartPath
  );
  const replacementType = normalizeComponentType(
    rawReplacementType || rawComponentType,
    prefabData.resolverStartPath
  );
  const { node, nodeId } = resolveNode(prefabData, nodeSelector, 'replace-component');

  if (isStub(elements, node)) {
    throw new Error(
      `editPrefab [replace-component]: 节点 "${node._name || nodeId}" 是 stub（嵌套 prefab 根），无法替换其内部组件`
    );
  }

  const { compId, comp: oldComp } = findSingleComponent(
    elements,
    node,
    componentType,
    rawComponentType
  );

  const compPrefabRef = resolveCompPrefabRef(
    prefabData,
    oldComp,
    node,
    replacementType,
    !!refreshFileId
  );
  const newComp = {
    __type__: replacementType,
    _name: typeof oldComp._name === 'string' ? oldComp._name : '',
    _objFlags: typeof oldComp._objFlags === 'number' ? oldComp._objFlags : 0,
    __editorExtras__: cloneSerialized(oldComp.__editorExtras__ || {}),
    node: ref(nodeId),
    _enabled: oldComp._enabled !== false,
    __prefab: compPrefabRef,
    _id: typeof oldComp._id === 'string' ? oldComp._id : '',
  };

  const preserve = preserveProperties === undefined ? true : preserveProperties;
  const keysToCopy = preserve === true
    ? Object.keys(oldComp).filter((key) => !isReservedCompField(key))
    : Array.isArray(preserve)
      ? preserve
      : [];

  for (const key of keysToCopy) {
    if (isReservedCompField(key)) {
      throw new Error(
        `editPrefab [replace-component]: preserveProperties 不允许包含保留字段 "${key}"`
      );
    }
    if (Object.prototype.hasOwnProperty.call(oldComp, key)) {
      newComp[key] = cloneSerialized(oldComp[key]);
    }
  }

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      newComp[key] = cloneSerialized(value);
    }
  }

  // 原位覆盖：所有指向 compId 的关系天然保持，不需要全局重写 __id__。
  elements[compId] = newComp;
  return nodeId;
}

module.exports = { execReplaceComponent };
