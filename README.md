#### 一、数据驱动

##### 00.数据初始化

- 1、获取 options 上的 data 属性生成 data 对象挂载到 `vm._data` 上
- 2、为 `vm._data` 上的属性创建代理

##### 01.$mount 总结

- 1、介绍了 Runtime+compiler 模式的 $mount 方法，在无渲染函数时，会根据 template、el 属性对应的模板编译为渲染函数
- 2、创建渲染 watcher，创建过程中调用了 `vm._update(vm._render(), hydrating)`

##### 02.`_render` 总结

- 1、在 render 函数中调用 vm.$createElement 函数生成 VNode 并返回
- 2、createElement 过程中根据 tag 判断创建渲染 vnode 或占位符 vnode

##### 03.`_update` 总结

- 1、根据要渲染的 vnode 创建真实 dom 替换要挂载的占位 dom

#### 二、组件化

##### 00.占位符 vnode 的创建

- 调用 createElement 方法时传入组件扩展选项时，根据组件扩展选项创建继承 Vue 的组件构造函数
- 创建 VNodeData 对象，并在上面安装组件钩子函数
- 创建占位符 vnode，传入 VNodeData 对象，并将组件构造函数放入 componentOptions 中传入

##### 01.根据占位符 vnode 创建组件并渲染组件

- 1、根据占位符 vnode 创建组件，组件 $mount 过程中创建渲染 watcher，并调用了 `vm._update(vm._render(), hydrating)`
- 2、`vm._render` 中调用了组件扩展选项中的渲染函数（根据 template、el 属性对应的模板编译成的渲染函数）生成渲染 vnode
- 3、`vm._update` 根据渲染 vnode 生成 dom 元素
- 4、将生成的 dom 元素赋值给组件的 $el 属性，将组件的 $el 属性赋值给占位符 vnode 的 elm 属性，最后将占位符 vnode 的 elm 属性插入 dom 树
