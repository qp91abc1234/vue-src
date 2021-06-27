/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'

function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  // 异步组件加载错误 && 存在错误组件，返回错误组件构造函数
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  // 返回异步组件工厂函数缓存的异步组件的构造器
  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  // 异步组件加载中 && 存在 loading 组件，返回 loading 组件构造函数
  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context)
  } else {
    const contexts = factory.contexts = [context]
    let sync = true

    const forceRender = () => {
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }
    }

    const resolve = once((res: Object | Class<Component>) => {
      // 异步组件工厂函数执行成功，用异步组件工厂函数缓存异步组件的构造器
      factory.resolved = ensureCtor(res, baseCtor)
      // 不是同步 resolve 的情况下强制渲染
      if (!sync) {
        forceRender()
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      // 显示错误组件
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender()
      }
    })

    // 执行异步组件工厂函数
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (typeof res.then === 'function') {
        // 因为有 then 属性，所以是 promise 对象
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      }
      // 如果返回值有 component 属性，则是高级异步组件
      else if (isDef(res.component) && typeof res.component.then === 'function') {
        res.component.then(resolve, reject)

        // 异步组件工厂函数缓存错误组件构造函数
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          // 异步组件工厂函数缓存 loading 组件构造函数
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          // loading 组件的显示
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender()
              }
            }, res.delay || 200)
          }
        }

        // 异步组件加载超时调用 reject 函数
        if (isDef(res.timeout)) {
          setTimeout(() => {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // 显示 loading 组件的延时为 0 时，返回 loading 组件构造函数
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
