/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    // mixin 为静态方法，this 为 Vue
    // 将混入对象合并到 Vue 构造函数的 options 属性上
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
