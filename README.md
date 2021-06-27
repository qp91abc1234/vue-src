#### 零、其他

##### 00.options 合并

- mergeOptions：合并函数，由深到浅的对合并选项进行合并，合并过程中会根据合并选项的键值寻找合适的合并策略进行合并
- 全局的 options 合并：创建 Vue 实例前调用 Vue.mixin，将混入对象合并到 Vue 构造函数的 options 属性上，后续创建的所有 Vue 实例都会受到混入对象的影响
- Vue 实例上的 options 合并：将构造函数中传入的参数 options 与 Vue 构造函数上的 options 进行合并，合并后赋值给 vm.$options
- 组件构造函数上的 options 合并：将组件扩展选项与父类构造函数 options 合并，将结果赋值给组件构造函数 options

##### 01.生命周期

- beforeCreate & created：在 Vue 实例初始化过程中执行，created 执行时可取到 datas 与 props
- beforeMount & mounted：mounted 函数中可访问 dom 元素
  - beforeMount 在 Vue 实例挂载前执行
  - 组件的 mounted 函数在 dom 元素插入 dom tree 后会通过 for 循环由子组件到父组件依次调用
  - 根 Vue 实例的 mounted 在组件的 mounted 函数执行后调用
- beforeUpdate & updated：渲染 watcher 在更新前后会调用 beforeUpdate & updated 钩子，多次执行
- beforeDestroy & destroyed

#### 一、数据驱动

##### 00.数据初始化

- 获取 options 上的 data 属性生成 data 对象挂载到 `vm._data` 上
- 为 `vm._data` 上的属性创建代理

##### 01.$mount 总结

- 介绍了 Runtime+compiler 模式的 $mount 方法，在无渲染函数时，会根据 template、el 属性对应的模板编译为渲染函数
- 创建渲染 watcher，创建过程中调用了 `vm._update(vm._render(), hydrating)`

##### 02.`_render` 总结

- 在 render 函数中调用 vm.$createElement 函数生成 VNode 并返回
- createElement 过程中根据 tag 判断创建渲染 vnode 或占位符 vnode

##### 03.`_update` 总结

- 根据要渲染的 vnode 创建真实 dom 替换要挂载的占位 dom

#### 二、组件化

##### 00.占位符 vnode 的创建

- 调用 createElement 方法时传入组件扩展选项时，根据组件扩展选项创建继承 Vue 的组件构造函数
- 创建 VNodeData 对象，并在上面安装组件钩子函数
- 创建占位符 vnode，传入 VNodeData 对象，并将组件构造函数放入 componentOptions 中传入

##### 01.根据占位符 vnode 创建组件并渲染组件

- 根据占位符 vnode 创建组件，组件 $mount 过程中创建渲染 watcher，并调用了 `vm._update(vm._render(), hydrating)`
- `vm._render` 中调用了组件扩展选项中的渲染函数（根据 template、el 属性对应的模板编译成的渲染函数）生成渲染 vnode
- `vm._update` 根据渲染 vnode 生成 dom 元素
- 将生成的 dom 元素赋值给组件的 $el 属性，将组件的 $el 属性赋值给占位符 vnode 的 elm 属性，最后将占位符 vnode 的 elm 属性插入 dom 树

##### 02.组件注册

- 全局组件的注册：使用 `Vue.component` 方法将组件扩展选项转换为组件构造函数，将组件构造函数其缓存至 `Vue.options[components]` 中
- 局部组件的注册：分为 Vue 实例下局部组件注册和组件下局部组件的注册，不会将组件扩展选项转换为组件构造函数，本质是将组件扩展选项中的 `components` 属性赋值给 `vm.$options` 属性
- 已注册组件的使用：render 函数执行过程中，根据注册的组件名获取组件扩展选项或组件构造函数生成占位符 `vnode`

##### 03.异步组件

- 异步组件的实现本质是两次渲染，先渲染成注释节点，当组件加载成功后，再通过 forceRender 函数重新渲染
