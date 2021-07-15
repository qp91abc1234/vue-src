/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  const prop = propOptions[key] // 属性值对象
  const absent = !hasOwn(propsData, key) // 是否缺省父组件传递的属性值
  let value = propsData[key] // 父组件传递的属性值

  // boolean 类型属性值的特殊处理
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) { // 属性值多个可能类型中有 boolean 类型
    if (absent && !hasOwn(prop, 'default')) { // 缺省父组件传递的属性值 && 无默认属性值
      value = false
    } else if (value === '' || value === hyphenate(key)) { // 父组件传的属性值为空字符串或小写连字符属性名
      const stringIndex = getTypeIndex(String, prop.type)
      // 属性值在多个可能的类型中不存在 string 类型或 string 类型优先级小于 boolean 类型
      if (stringIndex < 0 || booleanIndex < stringIndex) {
        value = true // 设置属性值为 true
      }
    }
  }
  // check default value
  if (value === undefined) { // 父组件传的属性值为 undefined
    value = getPropDefaultValue(vm, prop, key) // 获取默认属性值
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value) // 默认属性值为新创建的，需调用 observe 函数实现响应式
    toggleObserving(prevShouldObserve)
  }
  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) { // 开发环境 && 非 weex 环境下，进行属性值校验
    assertProp(prop, key, value, vm, absent)
  }
  return value
}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // 无默认属性值情况下返回 undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn( // 默认属性值的类型为 Object/Array 必须使用工厂函数来返回默认值，否则警告提示
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined && // 上一次设置的属性值为 undefined
    vm._props[key] !== undefined // 上一次的属性值不为 undefined
  ) {
    // 上一次设置的属性值为 undefined，但上一次的属性值不为 undefined，说明上一次设置了属性为默认值
    // 当前设置属性值为 undefined && 上一次设置了属性为默认值，则继续返回同一个的默认值
    // 避免监听该属性的 watcher 造成不必要的触发
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm) // 属性值为非函数类型，调用工厂函数生成默认属性值
    : def
}

/**
 * Assert whether a prop is valid.
 */
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    warn( // 父组件必须传属性值但属性值缺省时警告提示
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }
  if (value == null && !prop.required) {
    return
  }
  let type = prop.type // 取配置的类型进行类型校验
  let valid = !type || type === true // 未设置类型或类型值为 true，则校验通过
  const expectedTypes = []
  if (type) {
    if (!Array.isArray(type)) {
      type = [type] // 将 type 类型规范化为数组
    }
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i]) // 判断 value 是否是 type[i] 类型
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid // 是的话，中断循环
    }
  }
  if (!valid) {
    warn( // 类型检测失败，警告提示
      `Invalid prop: type check failed for prop "${name}".` +
      ` Expected ${expectedTypes.map(capitalize).join(', ')}` +
      `, got ${toRawType(value)}.`,
      vm
    )
    return
  }
  const validator = prop.validator // 用户自定义校验器
  if (validator) {
    if (!validator(value)) {
      warn( // 自定义校验失败，警告提示
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}

function getTypeIndex (type, expectedTypes): number {
  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }
  return -1
}
