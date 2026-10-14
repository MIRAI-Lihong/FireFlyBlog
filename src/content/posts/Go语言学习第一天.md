---
title: 'Go语言学习第一天'
published: 2026-10-13
description: '从零开始记录学习Go的历程'
category: '技术文章'
series: 'Go语言'
image: 'https://mirai-image-bed.oss-cn-shenzhen.aliyuncs.com/uploads/2026/10/14/be176afa-fc61-4ea6-8df6-3e1e80c50a65.jpeg'
toc: true
tags:
  - 'Go语言'
  - '开发'
  - '学习'
---


# Go 入门笔记：变量、输入输出、基本数据类型、数组与切片


最近开始从零学习 Go，这是第一阶段的学习记录，内容来自我实际编写的五个练习文件：变量定义、输入输出函数、基本数据类型、数组和切片。所有代码都在 Go 1.27.2 下实际编译运行过，文中的输出结果均为真实运行结果。


## 一、变量与常量的定义


Go 的变量声明有好几种写法，我把它们都试了一遍：


```go
// 先声明再赋值
var name string
name = "mirai"

// 声明并赋值
var name1 string = "mirai"

// 短声明（类型自动推断）
name2 := "mirai"

// 省略类型，由编译器推断
var name3 = "mirai"
```


这几种写法最终效果一样，运行后都输出 `mirai`。区别主要在于使用场景：`:=` 短声明最简洁，但**只能在函数内部使用**。


### 几条必须记住的规则


**1. 局部变量声明了就必须使用**，否则编译直接报错：


```plain text
declared and not used: name
```


这一点和很多语言不一样，Go 编译器非常严格，不存在"先声明留着以后用"的说法。


**2. 全局变量不能使用短声明。** 函数外的变量必须用 `var` 或 `const`：


```go
// 全局变量不能使用短声明
var age = 12
```


**3. 常量声明时必须赋值。** 我原来的注释写的是"常量声明后必须赋值"，这个表述不够准确——准确说是**声明的同时就必须初始化**，不能先声明再赋值，而且常量一旦定义就不能修改：


```go
const Version = "2.2"
```


**4. 多变量声明**有两种方式：


```go
// 方式1：一行声明多个
var a1, a2 = 1, 2

// 方式2：括号分组声明
var (
	a3 int = 1
	a4 int = 2
)
```


### 跨包访问：首字母大小写决定可见性


这一点让我印象很深。我在 `version` 包里定义了两个常量：


```go
package version

const Version = "2.3"
const mirai = "mirai"
```


在 main 包里：


```go
fmt.Println(version.Version) // 正常输出 2.3
// fmt.Println(version.mirai) // 编译错误！
```


**首字母大写的标识符才能被其他包访问（导出），小写开头的只能在包内部使用。** Go 没有 `public`/`private` 关键字，大小写本身就是访问控制规则。


## 二、输入输出函数


### Println、Printf、Sprintf 的区别


```go
// Println 自动换行，多个参数之间自动加空格
fmt.Println("hello", "你好") // 输出: hello 你好

// Printf 格式化输出，不自动换行，需要手动加 \n
fmt.Printf("%s hello \n", "mirai")

// Sprintf 不打印，返回格式化后的字符串
var f1 = fmt.Sprintf("%.2f\n", 3.14)
```


### 常用格式化动词


这里要**纠正我注释里的一个错误**：我当时把格式化动词写成了 `\s`、`\d`、`\f`，这是错的。Go 的格式化动词以 **`%`** 开头，反斜杠 `\` 是转义字符用的（比如 `\n` 换行）。代码里我写的是对的，注释记错了。


| 动词     | 作用           | 示例                                     | 输出               |
| ------ | ------------ | -------------------------------------- | ---------------- |
| `%s`   | 字符串          | `fmt.Printf("%s\n", "mirai")`          | `mirai`          |
| `%d`   | 整数           | `fmt.Printf("%d\n", 3)`                | `3`              |
| `%.2f` | 小数，`.2` 保留两位 | `fmt.Printf("%.2f\n", 3.1415926)`      | `3.14`           |
| `%T`   | 输出类型         | `fmt.Printf("%T %T\n", 3.14, "mirai")` | `float64 string` |
| `%v`   | 任意类型的默认格式    | `fmt.Printf("%v\n", 3.1415926)`        | `3.1415926`      |
| `%#v`  | 带 Go 语法格式的值  | `fmt.Printf("%#v\n", "")`              | `""`             |


我注释里把 `%v` 比作 TypeScript 的 `any`，这个类比帮助我理解了"什么类型都能接收"。不过严格来说 `%v` 不是类型，而是"按默认格式输出任意值"的动词。


`%v` 和 `%#v` 的区别在空字符串上特别明显：


```go
fmt.Printf("%v\n", "")  // 输出一行空白（什么都看不见）
fmt.Printf("%#v\n", "") // 输出: ""（能看到是个空字符串）
```


调试空字符串、带空格的字符串时，`%#v` 很有用。


### fmt.Scan 读取输入


```go
var age int
n, err := fmt.Scan(&age)
fmt.Println(n, err, age)
```


注意传的是 `&age`（变量的地址），Scan 才能把值写进去。它返回两个值：`n` 是成功读取的参数个数，`err` 是错误信息。我输入 `18` 后输出：


```plain text
1 <nil> 18
```


`1` 表示成功读到一个值，`<nil>` 表示没有错误（Go 里 `nil` 相当于其他语言的 `null`）。


## 三、基本数据类型


### 整型


```go
var u8 uint = 255
var i8 int8 = 127
```


这里要**纠正注释里的一个理解错误**：我原来写的是"uint 无符号的int8"，这是不对的。

- `uint` 是**平台相关大小**的无符号整型：32 位平台是 32 位，64 位平台是 64 位。
- 范围 `0 ~ 255` 的是 **`uint8`**（8 位无符号整型），不是 `uint`。

`int8` 的范围是 `-128 ~ 127`，这个注释是对的。给 `int8` 赋 128 会直接编译溢出报错。


### 浮点型


浮点型只有 `float32` 和 `float64`。用 `:=` 或省略类型声明时，**浮点数字面量默认推断为** **`float64`**。从上面 `%T` 的输出 `float64 string` 也能验证这一点。


### 字符：byte 和 rune


Go 里字符分两种处理方式：


```go
// 单字节字符：byte 处理 ASCII
var a byte = 'a'
fmt.Printf("%c %d\n", a, a) // 输出: a 97

// 多字节字符：rune 处理 Unicode
var z rune = '中'
fmt.Printf("%c %d\n", z, z) // 输出: 中 20013
```


（注释里的"ASCLL"是拼写错误，应为 ASCII。）


几个要点：

- 字符用**单引号** `''`，字符串用双引号 `""` 或反引号（反引号原样输出，不解析转义字符）。
- `%c` 按字符打印，`%d` 打印对应的编码值。`'a'` 的 ASCII 码是 97，`'中'` 的 Unicode 码点是 20013。
- 有意思的是，即使声明为 `int` 类型，`%c` 也会按字符打印：

```go
var a1 int = 97
fmt.Printf("%c %d\n", a1, a1) // 输出: a 97
```


说明 `%c` 看的是数值对应的码点，不限制具体整型。


### 布尔型与零值

- 布尔型只有 `true` 和 `false` 两个值，**零值（默认值）是** **`false`**。
- **不允许把整型强制转换为布尔型**，也不能参与数值运算。这点和 C/JavaScript 很不一样，Go 里写 `if 1 {}` 是编译错误。

**零值**是个重要概念：变量只声明不赋值时，会自动得到对应类型的零值——数值类型是 `0`，字符串是 `""`，布尔是 `false`。


## 四、数组


```go
// Go 的数组长度是固定的
var nameList [3]string = [3]string{"mirai", "kami", "kale"}
fmt.Println(nameList)      // [mirai kami kale]
fmt.Println(len(nameList)) // 3
nameList[0] = "mirai1"     // 通过下标修改
fmt.Println(nameList)      // [mirai1 kami kale]
```


关键点：**数组的长度是类型的一部分**，`[3]string` 和 `[4]string` 是两种不同的类型，声明后长度不能改变。想要"可变长的数组"，就要用到下面的切片。


## 五、切片


切片可以理解为**动态数组**，长度可以变化：


```go
// make([]type, length, capacity)，capacity 可省略
nameList := make([]string, 0)

nameList = append(nameList, "mirai")
nameList = append(nameList, "kale")
fmt.Println(nameList, nameList[0]) // [mirai kale] mirai
```


`append` 用来追加元素，注意它**返回新切片**，所以要赋值回原变量。


关于切片的零值：**只声明不初始化的切片，零值是** **`nil`**：


```go
var s []string
fmt.Println(s == nil) // true
```


这里有个容易混的细节：`make([]string, 0)` 和 `[]string{}` 创建的是**空的但非 nil** 的切片。长度为 0 和等于 nil 是两回事。


### 切片排序


标准库 `sort` 提供了现成的排序功能：


```go
var list = []int{4, 1, 3, 2}

sort.Ints(list)
fmt.Println(list) // [1 2 3 4] 升序

sort.Sort(sort.Reverse(sort.IntSlice(list)))
fmt.Println(list) // [4 3 2 1] 降序
```

- `sort.Ints` 直接对 int 切片升序排序。
- 降序麻烦一点：`sort.IntSlice(list)` 把切片包装成可排序接口，`sort.Reverse` 反转排序方向，最后交给 `sort.Sort` 执行。
- 排序是**原地修改**的，不需要接收返回值。

## 易错点与勘误汇总


这次学习中注释里记错或不准确的地方，整理如下：


| 位置   | 原注释             | 纠正                                  |
| ---- | --------------- | ----------------------------------- |
| 输入输出 | `\s` `\d` `\f`  | 格式化动词是`%s` `%d` `%f`，`\` 是转义字符      |
| 基本类型 | uint 是无符号的 int8 | uint 大小随平台（32/64 位）；`0~255` 是 uint8 |
| 基本类型 | ASCLL           | 正确拼写为 ASCII                         |
| 变量定义 | 常量声明后必须赋值       | 常量**声明时**必须初始化                      |


另外还有几个 Go 和其他语言差异较大的地方值得再强调：

1. 局部变量声明后不使用会编译报错。
2. 没有 `public`/`private`，首字母大小写就是访问权限。
3. 整型不能当布尔用，`if` 条件必须是布尔表达式。
4. 同一个包（目录）里只能有一个 `main` 函数——这也是我把练习函数命名成 `main1`、`main2`…… 的原因，只有切片练习是真正的程序入口。

## 总结


这次掌握了 Go 最基础的部分：变量的四种声明方式、常量规则、包级可见性、`fmt` 的输入输出和格式化动词、整型/浮点/字符/布尔的细节、定长数组和动态切片。整体感受是 Go 的规则"少而硬"——很多其他语言里宽松的地方（未使用变量、隐式类型转换）在 Go 里直接编译失败，前期会有点不适应，但这种严格其实能帮我更早暴露问题。


后续值得继续探索的方向：切片底层数组与容量扩容机制、`sort` 的自定义排序、以及还没有接触过的 map、流程控制和函数。

