# 在B站看点有用的

> 注意，你正处在开发版本分支上，下面的安装会为你安装正在开发中的开发版本

## 描述

这是一个油猴脚本，旨在通过**自主**限制，减少在B站无用内容上浪费的时间。

为了避免~肌肉记忆~关弹窗，插件会强制弹窗询问要观看的视频类别并统计，以便自主反思。

## 使用

打开B站视频页面，将会弹窗主动询问是否有用。

无论你选择有用还是无用，脚本都会询问你观看的视频类别。

你填写的每一条类别都会被存储在**本地**，你可以在启用该脚本的情况下，点击油猴扩展的图标，然后选择查看或导出数据。脚本还自带了图表统计工具，帮助你简单直观地了解自己的观看习惯并做出反思。

- 当你观看有用内容时，脚本将完全不会打扰你。
- 当你观看无用内容时，将启动倒计时。
  - 倒计时每天都会重置，默认总共30分钟，可以修改。
  - 当剩余时间达到告警时长（默认5分钟）时，将强制禁用全屏。
  - 当剩余时长耗尽，将强制关闭标签页，且当天不能再观看无用视频。

## 安装方法

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
2. 点击[这里](https://github.com/ABitGinger/BiLimit/raw/dev/%E5%9C%A8B%E7%AB%99%E7%9C%8B%E7%82%B9%E6%9C%89%E7%94%A8%E7%9A%84-1.0.user.js)安装即可✅

(*不推荐*)或点击[这里](https://github.com/ABitGinger/BiLimit/raw/main/%E5%9C%A8B%E7%AB%99%E7%9C%8B%E7%82%B9%E6%9C%89%E7%94%A8%E7%9A%84(%E7%8B%AC%E7%AB%8B%E8%AE%A1%E6%97%B6)-0.1.user.js)安装独立计时版：每个视频默认单独限额5分钟，默认剩余1分钟时提示。*有把B站变成短视频平台的风险！*

## 修改限额

点击Tampermonkey扩展图标，打开管理面板，编辑脚本，看巨长的箭头所指位置，手动修改该处即可。

---

脚本采用[GPL3.0](https://www.gnu.org/licenses/gpl-3.0.zh-cn.html#license-text)协议，欢迎各位在遵守协议内容的前提下，发挥创意，扩展优化！

喜欢的话记得丢个star⭐~
