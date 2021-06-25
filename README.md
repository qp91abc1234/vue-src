# vue-src
00_数据的初始化
1、获取 options 上的 data 属性生成 data 对象挂载到 vm._data 上
2、为 vm._data 上的属性创建代理

01_$mount 的实现
1、介绍了 Runtime+compiler 模式的 $mount方法，在无渲染函数时，会根据 template、el 属性对应的模板编译为渲染函数
2、渲染 watcher 的创建
