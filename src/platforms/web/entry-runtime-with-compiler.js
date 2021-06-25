/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 缓存 Runtime 模式下的 $mount方法
const mount = Vue.prototype.$mount
/** Vue 挂载函数 */
/** 定义 Runtime+compiler 模式的 $mount 方法，将模板转换为渲染函数 */
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 根据 el 参数返回要挂载的占位 dom 元素
  el = el && query(el)

  // 如果挂载的占位 dom 元素是 html/body 则报警告，因为挂载的占位 dom 元素会被移除
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // 判断 options 中是否有定义 render 属性
  if (!options.render) {
    let template = options.template
    // 判断 options 中是否有定义 template 属性
    if (template) {
      // 判断 template 是否为字符串
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          // 如果 template 属性中使用了 id 选择器(ex.'#app')，则根据 id 选择器获取模板字符串
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      }
      // template 是 dom 对象
      else if (template.nodeType) {
        template = template.innerHTML
      }
      // 无效的 template
      else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    }
    // 判断是否存在 el 参数
    else if (el) {
      // 将挂载的占位 dom 元素作为 template
      template = getOuterHTML(el)
    }

    // 判断 template 是否存在
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // 将 template 编译为渲染函数，并缓存至 options 中
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  // 调用 Runtime 模式下的 $mount方法
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
