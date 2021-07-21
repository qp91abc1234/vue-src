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

#### 三、响应式（上）

##### 00. observe 方法
- 作用：为属性值双向绑定 Observer 对象，属性值需为对象

##### 01.Observer 对象
- 作用：
    - 若绑定的属性值为数组
        - 扩展数组原型上的的方法，ex.push，使其具有响应式相关功能
        - 遍历绑定的数组，为数组元素调用 observe 方法
   - 若绑定的属性值为对象
       - 遍历绑定的对象，为其中的属性 defineReactive

##### 02.defineReactive 方法
- 作用：
    - 若属性值为对象，则为属性值调用 observe 方法
    - 为属性定义响应式，即重定义属性描述符中的 get/set 方法

##### 03.dep 对象
- 定义：
    - 可理解为发布者，负责收集/通知订阅者
- 分类：
    - 属性 dep
        - 可理解为属性描述符中 get/set 所缓存的 dep
        - get 方法调用时，属性 dep 收集依赖
    - 属性值扩展 dep
        - 可理解为属性值绑定的观察者对象中的 dep

##### 04.依赖
- 定义：
    - 可理解为订阅者，是组件的渲染 watcher，或者是组件选项中用户定义的 watcher
- 作用：
    - 让组件进行重新渲染

##### 05.对值为对象的属性进行依赖收集
- 属性 dep 收集依赖
    - 在对属性值进行修改时会触发 set 方法，set 方法中缓存了属性 dep，因此属性值的修改会触发组件重新渲染
- 属性值扩展 dep 收集依赖
    - 属性值扩展 dep 收集的依赖与属性 dep 相同
    - 通过 Vue.set 方法对属性值进行新增属性时，可通知属性值扩展 dep 中的依赖进行重新渲染

##### 06.对值为数组的属性进行依赖收集
- 属性 dep 收集依赖
- 属性值扩展 dep 收集依赖
- 属性值为数组，遍历数组，若存在嵌套数组，则会递归遍历，遍历的数组元素若为对象，为数组元素的属性值扩展 dep 收集依赖
    - 因为数组索引未定义响应式，当数组元素为对象时，若不对数组元素的属性值扩展 dep 收集依赖，通过 Vue.set 新增数组元素的属性时，就无法通知依赖进行重新渲染

##### 07.总结
- 对 data 属性值进行 observe 后
    - data 下所有普通对象的属性都定义了响应式
    - data 下所有为对象的属性值都双向绑定了观察者对象
    - data 下所有为数组的属性值，都未对数组索引定义响应式，因此对数组元素的获取/修改不会触发响应式相关的内容

#### 四、响应式（下）

##### 00.计算属性

- 计算属性实现的核心是 watcher
- 计算属性的值为求值函数，求值在第一次 get 过程中执行
- 计算 watcher 的回调为框架默认，用于通知依赖进行重新渲染
- 计算属性 get 执行时
    - 渲染 watcher 对计算属性进行了订阅
    - 计算 watcher 订阅了计算属性依赖的响应式数据
- 计算属性依赖的响应式数据修改时
    - 通知计算 watcher 更新，对计算属性重新求值
    - 新值与旧值不同时，再通知渲染 watcher 进行重新渲染

##### 01.侦听属性

- 侦听属性实现的核心是 watcher
- 侦听属性的值为侦听 watcher 的回调函数
- 侦听 watcher 创建时订阅监听属性
- 侦听 watcher 可设置选项
    - immediate：监听 watcher 创建后立马调用回调函数
    - sync：使回调函数同步执行，否则在 nextTick 执行
    - deep：监听的属性为对象/数组时，可递归监听属性的子属性/子元素

##### 02.props 更新

- 父组件中数据变化，通知父组件重新渲染
    - vm._render 过程中，根据父组件实例中的新数据生成新的子组件 vnode
        - 此时子组件 vnode.componentOptions.propsData 已得到更新
    - vm._update 过程中，进行 patch 操作，递归执行 patchVnode
        - patchVnode 到子组件 vnode 时，用新子组件 vnode 上的数据更新对应的组件实例
            - 更新 props，触发响应式（若此时子组件渲染 watcher 有订阅 props，则通知子组件重新渲染）

##### 03.组件更新

- 数据变化后，触发渲染 watcher 重新执行
    - vm._render 过程中，生成新的 vnode
    - vm._update 过程中，新旧 vnode 执行 patch 函数
        - 新旧 vnode 不同时，删除旧 vnode 对应的 dom 元素，挂载新 vnode 对应的 dom 元素
        - 新旧 vnode 相同时
            - vnode 为组件 vnode，根据新 vnode 上的数据对 vnode 对应组件实例上的数据进行更新，进而触发组件重新渲染
            - vnode 为普通 vnode
                - 基于新旧 vnode 的差异对旧 vnode 对应的 dom 元素进行更新
                - 通过 diff 算法对 vnode.children 进行更新

#### 五、编译（上）

##### 00.模板编译流程

- 利用函数柯里化思想生成编译函数，将模板编译成渲染函数
    - 传入基础编译函数 baseCompile
    - 传入基础选项 baseOptions
    - 内部生成 compile 函数并传入
    - 返回编译函数，编译函数分为两个阶段
        - 执行 compile 函数返回模板对应的渲染函数代码字符串
        - 执行 createFunction 函数，根据渲染函数代码字符串生成 render 函数

##### 01.模板解析与 ast 元素创建

- ast 元素类型
    - 1：普通 ast 元素
    - 2：含 mustache 语法的文本 ast 元素
    - 3：不含 mustache 语法的文本 ast 元素或注释 ast 元素

- 模板解析过程中的 stack
    - 遇到开始标签压栈，遇到结束标签出栈
    - 作用：清理不配对标签以及根标签后的文本内容

- ast 元素创建过程中的 stack
    - 创建开始标签的 ast 元素时压栈，闭合开始标签的 ast 元素时出栈
    - 作用：多根节点情况判断 && 记录父 ast 元素至根 ast 元素

- 模板解析与 ast 元素创建流程
    - 遍历模板字符串，通过正则表达式匹配标签、属性
    - 根据匹配到的标签创建 ast 元素
    - 解析匹配到的属性，将解析后的数据添加到 ast 元素
    - 将生成的 ast 元素加入 ast 树