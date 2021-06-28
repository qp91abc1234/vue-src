/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value // 观察者对象单向绑定观察的数据
    this.dep = new Dep() // 依赖管理对象，此处定义的称为属性值 dep
    this.vmCount = 0
    def(value, '__ob__', this) // 观察的数据单向绑定观察者对象
    if (Array.isArray(value)) {
      const augment = hasProto // 运行环境是否支持原型链
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys) // 对数组中的方法(ex.push)进行扩展，可通过属性值 dep 通知依赖进行重新渲染
      this.observeArray(value) // 遍历数组中的元素，为其绑定观察者对象（元素需为对象元素）
    } else {
      this.walk(value) // 遍历对象中的每个属性，为其定义响应式
    }
  }

  // 遍历对象中的每个属性，为其定义响应式
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  // 对数组的元素进行双向绑定观察者对象
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 数据校验
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__ // 数据存在观察者对象，则直接返回
  } else if (
    shouldObserve &&
    !isServerRendering() && // 非服务端渲染
    (Array.isArray(value) || isPlainObject(value)) && // 数组对象或普通对象
    Object.isExtensible(value) && // 可扩展
    !value._isVue // 非 Vue 实例
  ) {
    ob = new Observer(value) // 双向绑定观察者对象
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 依赖管理对象，缓存对属性的依赖，此处定义的称为属性 dep
  const dep = new Dep()

  // 属性校验
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // 获取属性值
  const getter = property && property.get
  const setter = property && property.set
  // 属性上未定义 get 方法 && 参数未传入属性值时
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 非浅递归定义响应式时为属性值双向绑定观察者对象
  let childOb = !shallow && observe(val)
  // 通过 get/set 方法为属性定义响应式
  // get 方法中收集依赖
  // set 方法中通知依赖
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend() // 属性 dep 收集依赖
        if (childOb) {
          // 属性值扩展 dep 收集依赖
          // 通过 Vue.set 方法对属性值进行新增属性时，可通知属性值扩展 dep 中的依赖进行重新渲染
          childOb.dep.depend()
          // 属性值为数组，遍历数组，若存在嵌套数组，则会递归遍历，遍历的数组元素若为对象，为数组元素的属性值扩展 dep 收集依赖
          // 因为数组索引未定义响应式，当数组元素为对象时，若不对数组元素的属性值扩展 dep 收集依赖，通过 Vue.set 新增数组元素的属性时，就无法通知依赖进行重新渲染
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 非浅递归定义响应式时为新属性值双向绑定观察者对象
      childOb = !shallow && observe(newVal)
      // 属性 dep 通知依赖重新渲染
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }

  // 对数组进行修改
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val) // splice 方法已被重定义，可通过属性值 dep 通知依赖进行重新渲染
    return val
  }

  // 属性存在于 target 中，已经是响应式，可直接赋值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }

  // 获取 target 的观察者对象
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }

  // target 对象非响应式，赋值后直接返回
  if (!ob) {
    target[key] = val
    return val
  }

  // 给 target 新增响应式属性
  defineReactive(ob.value, key, val)
  // 让 target 对象的属性值扩展 dep 通知依赖重新渲染
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
