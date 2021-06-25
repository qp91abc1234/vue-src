#### 一、数据驱动
##### 00_数据初始化
- 1、获取 options 上的 data 属性生成 data 对象挂载到 vm._data 上
- 2、为 vm._data 上的属性创建代理

##### 01_$mount 总结
- 1、介绍了 Runtime+compiler 模式的 $mount方法，在无渲染函数时，会根据 template、el 属性对应的模板编译为渲染函数
- 2、渲染 watcher 的创建，创建过程中调用了 `vm._update(vm._render(), hydrating)`

##### 02_`_render` 总结
- 在 render 函数中调用 vm.$createElement 函数生成 VNode 并返回
- createElement 过程中根据 tag 判断创建渲染 vnode 或占位符 vnode