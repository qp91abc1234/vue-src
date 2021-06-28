/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 依赖管理对象绑定依赖
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 依赖管理对象移除依赖
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 建立依赖管理对象与依赖间的双向绑定
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知依赖进行更新
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget (_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}
